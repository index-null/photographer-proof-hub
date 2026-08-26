/**
 * 客户侧（免登录）访问鉴权辅助。
 *
 * - `resolveActiveShare`：按 slug 取出分享链接，并校验「存在 → 启用 → 未过期」。
 * - `authorizeGuest`：先校验 viewToken 签名与有效期、再确认 token 绑定的 slug
 *   与本次请求一致，最后复核链接仍有效。供 `guest.*` 路由统一调用。
 *
 * viewToken 的 slug 绑定 + 此处二次复核，保证「摄影师关闭/过期链接」后，客户即便
 * 持有旧 token 也会被拒绝（Iter 4.1「刷新看到已失效」的落地依据）。
 */

import { ORPCError } from "@orpc/server";
import type { createDb } from "@photographer-proof-hub/db";
import { shareLink } from "@photographer-proof-hub/db/schema/share_link";
import { eq } from "drizzle-orm";

import { verifyViewToken } from "./view-token";

export type ActiveShare = {
	id: string;
	slug: string;
	galleryId: string;
	accessCodeHash: string | null;
	isActive: boolean;
	expiresAt: Date | null;
};

/** 按 slug 解析当前有效的分享链接，任一条件不满足抛对应 ORPCError。 */
export async function resolveActiveShare(
	db: ReturnType<typeof createDb>,
	slug: string,
): Promise<ActiveShare> {
	const [row] = await db
		.select({
			id: shareLink.id,
			slug: shareLink.slug,
			galleryId: shareLink.galleryId,
			accessCodeHash: shareLink.accessCodeHash,
			isActive: shareLink.isActive,
			expiresAt: shareLink.expiresAt,
		})
		.from(shareLink)
		.where(eq(shareLink.slug, slug));

	if (!row) {
		throw new ORPCError("NOT_FOUND", { message: "分享链接不存在" });
	}
	if (!row.isActive) {
		throw new ORPCError("FORBIDDEN", { message: "链接已失效" });
	}
	if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
		throw new ORPCError("GONE", { message: "链接已过期" });
	}
	return row;
}

/**
 * 校验 viewToken 并解析出当前有效的分享链接。token 绑定的 slug 必须与入参一致，
 * 否则视为越权。返回分享链接关键信息供后续业务使用。
 */
export async function authorizeGuest(
	db: ReturnType<typeof createDb>,
	secret: string | undefined,
	slug: string,
	token: string,
): Promise<ActiveShare> {
	const payload = await verifyViewToken(secret, token);
	if (payload.slug !== slug) {
		throw new ORPCError("FORBIDDEN", { message: "凭证与链接不匹配" });
	}
	return resolveActiveShare(db, slug);
}
