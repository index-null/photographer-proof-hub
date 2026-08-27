import { ORPCError } from "@orpc/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getClientKey, loadToken, saveToken } from "@/lib/guest";
import { client } from "@/utils/orpc";

export type GuestPhoto = {
	id: string;
	galleryId: string;
	r2Key: string;
	originalFilename: string;
	sortOrder: number;
	width: number | null;
	height: number | null;
	size: number;
	createdAt: Date;
	starred: boolean;
};

export type GuestGallery = {
	id: string;
	name: string;
	description: string | null;
	watermark: unknown;
};

export type GuestComment = {
	id: string;
	shareLinkId: string;
	photoId: string | null;
	clientKey: string;
	name: string | null;
	content: string;
	createdAt: Date;
};

/** 客户页状态机：从「校验」推进到「浏览」，或落到各失败状态页。 */
export type GuestPhase =
	| "init"
	| "needCode"
	| "browse"
	| "notFound"
	| "expired"
	| "disabled"
	| "wrongCode";

export type GuestState = {
	phase: GuestPhase;
	token: string | null;
	gallery: GuestGallery | null;
	photos: GuestPhoto[];
	error: string | null;
};

const INITIAL: GuestState = {
	phase: "init",
	token: null,
	gallery: null,
	photos: [],
	error: null,
};

/**
 * 管理客户免登录会话：匿名 clientKey + viewToken 的获取与复用，
 * 并把 `guest.verify` 的各类错误映射为对应状态页。
 */
export function useGuest(slug: string) {
	const clientKey = useRef<string>(getClientKey()).current;
	const [state, setState] = useState<GuestState>(INITIAL);
	const tokenRef = useRef<string | null>(loadToken(slug));

	const applyVerify = useCallback(
		async (code: string) => {
			try {
				const res = await client.guest.verify({ slug, code });
				saveToken(slug, res.viewToken);
				tokenRef.current = res.viewToken;

				const [gallery, photos] = await Promise.all([
					client.guest.gallery({ slug, viewToken: res.viewToken }),
					client.guest.photos({
						slug,
						viewToken: res.viewToken,
						clientKey,
					}),
				]);

				setState({
					phase: "browse",
					token: res.viewToken,
					gallery: gallery as GuestGallery,
					photos: photos as GuestPhoto[],
					error: null,
				});
			} catch (e) {
				if (e instanceof ORPCError) {
					switch (e.code) {
						case "NOT_FOUND":
							setState({ ...INITIAL, phase: "notFound" });
							break;
						case "GONE":
							setState({ ...INITIAL, phase: "expired" });
							break;
						case "FORBIDDEN":
							if (e.message?.includes("提取码")) {
								setState((prev) =>
									prev.phase === "browse"
										? prev
										: {
												...INITIAL,
												phase: code ? "wrongCode" : "needCode",
												error: e.message ?? null,
											},
								);
							} else {
								setState({ ...INITIAL, phase: "disabled" });
							}
							break;
						default:
							setState({ ...INITIAL, phase: "notFound" });
					}
					return;
				}
				setState({ ...INITIAL, phase: "notFound" });
			}
		},
		[slug, clientKey],
	);

	/** 提交提取码（空串表示无码链接直接校验）。 */
	const submitCode = useCallback(
		(code: string) => applyVerify(code),
		[applyVerify],
	);

	/** 用已缓存 token 直接尝试拉数据；失败再走 verify 兜底。 */
	useEffect(() => {
		let cancelled = false;
		if (tokenRef.current) {
			const token = tokenRef.current;
			Promise.all([
				client.guest.gallery({ slug, viewToken: token }),
				client.guest.photos({ slug, viewToken: token, clientKey }),
			])
				.then(([gallery, photos]) => {
					if (cancelled) return;
					setState({
						phase: "browse",
						token,
						gallery: gallery as GuestGallery,
						photos: photos as GuestPhoto[],
						error: null,
					});
				})
				.catch(() => {
					if (!cancelled) void applyVerify("");
				});
		} else {
			void applyVerify("");
		}
		return () => {
			cancelled = true;
		};
	}, [slug, clientKey, applyVerify]);

	/** 切换某张图的标星状态，返回最新 starred。 */
	const toggleStar = useCallback(
		async (photoId: string, current: boolean): Promise<boolean> => {
			const token = tokenRef.current;
			if (!token) return current;
			const res = current
				? await client.guest.unstar({
						slug,
						viewToken: token,
						photoId,
						clientKey,
					})
				: await client.guest.star({
						slug,
						viewToken: token,
						photoId,
						clientKey,
					});
			const starred = res.starred;
			setState((prev) => ({
				...prev,
				photos: prev.photos.map((p) =>
					p.id === photoId ? { ...p, starred } : p,
				),
			}));
			return starred;
		},
		[slug, clientKey],
	);

	return { state, clientKey, submitCode, toggleStar };
}
