import { Button } from "@photographer-proof-hub/ui/components/button";
import { Input } from "@photographer-proof-hub/ui/components/input";
import { Textarea } from "@photographer-proof-hub/ui/components/textarea";
import { cn } from "@photographer-proof-hub/ui/lib/utils";
import {
	ChevronLeft,
	ChevronRight,
	MessageSquare,
	Star,
	X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { client } from "@/utils/orpc";
import { CanvasImage } from "./canvas-image";
import type { GuestComment, GuestPhoto } from "./use-guest";

function formatTime(d: Date): string {
	return new Intl.DateTimeFormat("zh-CN", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(d));
}

type ViewMode = "all" | "starred";

/**
 * 大图查看器（灯箱）：Canvas 渲染 + 左右切换 + 快速收藏 + 针对单张留言。
 * - 当前图以 id 跟踪，切图 / 切「收藏视图」时列表变化也不会错位。
 * - 评论严格绑定到当前图片并实时展示；键盘 `Esc` 关闭 / `←/→` 切换 / `s` 收藏。
 * - 移动端支持左右滑动切换。
 */
export function Lightbox({
	photos,
	initialId,
	token,
	slug,
	clientKey,
	commentsByPhoto,
	view,
	onViewChange,
	onCommentAdded,
	onClose,
	onStarred,
}: {
	photos: GuestPhoto[];
	initialId: string;
	token: string;
	slug: string;
	clientKey: string;
	commentsByPhoto: Map<string, GuestComment[]>;
	view: ViewMode;
	onViewChange: (v: ViewMode) => void;
	onCommentAdded: () => void;
	onClose: () => void;
	onStarred: (photoId: string, current: boolean) => Promise<boolean>;
}) {
	// 以 id 跟踪当前图，列表（如切到「收藏视图」）变化时仍能稳定定位。
	const [currentId, setCurrentId] = useState(initialId);
	const index = photos.findIndex((p) => p.id === currentId);
	const photo = index >= 0 ? photos[index] : photos[0];
	const comments = photo ? (commentsByPhoto.get(photo.id) ?? []) : [];

	const [commenting, setCommenting] = useState(false);
	const [name, setName] = useState("");
	const [content, setContent] = useState("");
	const [posting, setPosting] = useState(false);
	const touchX = useRef<number | null>(null);

	// 列表变化导致当前图掉出（如「收藏视图」下取消收藏）：回退到列表首图；
	// 列表为空则直接关闭灯箱。
	useEffect(() => {
		if (photos.length === 0) {
			onClose();
			return;
		}
		if (!photos.some((p) => p.id === currentId)) {
			setCurrentId(photos[0].id);
		}
	}, [photos, currentId, onClose]);

	const resetInput = useCallback(() => {
		setCommenting(false);
		setContent("");
	}, []);

	const navigate = useCallback(
		(delta: number) => {
			if (photos.length === 0) return;
			const base = index >= 0 ? index : 0;
			const next = (base + delta + photos.length) % photos.length;
			setCurrentId(photos[next].id);
			resetInput();
		},
		[photos, index, resetInput],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			const tag = (e.target as HTMLElement | null)?.tagName;
			if (tag === "INPUT" || tag === "TEXTAREA") return;
			if (e.key === "Escape") {
				if (commenting) setCommenting(false);
				else onClose();
			} else if (e.key === "ArrowLeft") {
				navigate(-1);
			} else if (e.key === "ArrowRight") {
				navigate(1);
			} else if (e.key.toLowerCase() === "s") {
				if (photo) void onStarred(photo.id, photo.starred);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, navigate, commenting, photo, onStarred]);

	const toggleStar = useCallback(() => {
		if (photo) void onStarred(photo.id, photo.starred);
	}, [photo, onStarred]);

	const postComment = async () => {
		if (!photo) return;
		const text = content.trim();
		if (!text) {
			toast.error("请输入留言内容");
			return;
		}
		setPosting(true);
		try {
			await client.guest.comment.create({
				slug,
				viewToken: token,
				clientKey,
				name: name.trim() || undefined,
				content: text,
				photoId: photo.id,
			});
			toast.success("留言已提交");
			resetInput();
			onCommentAdded();
		} catch {
			toast.error("留言提交失败");
		} finally {
			setPosting(false);
		}
	};

	const onTouchStart = (e: React.TouchEvent) => {
		touchX.current = e.touches[0]?.clientX ?? null;
	};
	const onTouchEnd = (e: React.TouchEvent) => {
		if (touchX.current === null) return;
		const dx =
			(e.changedTouches[0]?.clientX ?? touchX.current) - touchX.current;
		touchX.current = null;
		if (Math.abs(dx) > 50) navigate(dx < 0 ? 1 : -1);
	};

	if (!photo) return null;

	const displayIndex = index >= 0 ? index : 0;

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-black/95">
			{/* 顶栏：序号 / 收藏视图切换 / 快速收藏 / 关闭 */}
			<div className="flex items-center justify-between gap-2 p-3 text-white">
				<div className="flex items-center gap-2">
					<button
						type="button"
						aria-label="关闭"
						onClick={onClose}
						className="rounded-full p-1.5 transition-colors hover:bg-white/10"
					>
						<X className="size-5" />
					</button>
					<span className="text-white/70 text-xs">
						{displayIndex + 1} / {photos.length}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<button
						type="button"
						aria-label="切换收藏视图"
						onClick={() => onViewChange(view === "all" ? "starred" : "all")}
						className={cn(
							"flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors",
							view === "starred"
								? "bg-yellow-400/20 text-yellow-300"
								: "text-white/70 hover:bg-white/10",
						)}
					>
						<Star
							className={
								view === "starred"
									? "size-4 fill-yellow-400 text-yellow-400"
									: "size-4"
							}
						/>
						<span className="text-xs">
							{view === "starred" ? "仅收藏" : "收藏视图"}
						</span>
					</button>
					<button
						type="button"
						aria-label={photo.starred ? "取消收藏" : "收藏"}
						onClick={() => void toggleStar()}
						className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors hover:bg-white/10"
					>
						<Star
							className={
								photo.starred
									? "size-5 fill-yellow-400 text-yellow-400"
									: "size-5 text-white/80"
							}
						/>
						<span className="text-xs">{photo.starred ? "已收藏" : "收藏"}</span>
					</button>
				</div>
			</div>

			{/* 图片区：左右切换 + 触摸滑动 */}
			<div
				className="relative min-h-0 flex-1"
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
			>
				<CanvasImage
					key={photo.id}
					r2Key={photo.r2Key}
					token={token}
					fit="contain"
					className="h-full w-full"
				/>
				<button
					type="button"
					aria-label="上一张"
					onClick={() => navigate(-1)}
					className="absolute top-1/2 left-1 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
				>
					<ChevronLeft className="size-6" />
				</button>
				<button
					type="button"
					aria-label="下一张"
					onClick={() => navigate(1)}
					className="absolute top-1/2 right-1 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
				>
					<ChevronRight className="size-6" />
				</button>
			</div>

			{/* 底部：常驻留言入口 + 评论列表 */}
			<div className="flex shrink-0 flex-col border-white/10 border-t bg-black/95 text-white">
				{commenting ? (
					<div className="space-y-2 p-3">
						<Input
							value={name}
							placeholder="昵称（可选）"
							className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
							onChange={(e) => setName(e.target.value)}
						/>
						<Textarea
							value={content}
							placeholder="留言给这张照片…"
							className="border-white/20 bg-white/10 text-white placeholder:text-white/40"
							onChange={(e) => setContent(e.target.value)}
						/>
						<div className="flex justify-end gap-2">
							<Button
								size="sm"
								variant="ghost"
								className="text-white hover:bg-white/10"
								onClick={() => setCommenting(false)}
							>
								取消
							</Button>
							<Button
								size="sm"
								disabled={posting}
								onClick={() => void postComment()}
							>
								{posting ? "提交中…" : "提交"}
							</Button>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-2 p-3">
						<Button
							variant="ghost"
							className="flex-1 justify-start text-white hover:bg-white/10"
							onClick={() => setCommenting(true)}
						>
							<MessageSquare className="size-4" />
							留言给这张
						</Button>
						{comments.length > 0 ? (
							<span className="shrink-0 text-white/50 text-xs">
								{comments.length} 条留言
							</span>
						) : null}
					</div>
				)}

				{comments.length > 0 ? (
					<ul className="max-h-[28vh] space-y-2 overflow-y-auto border-white/10 border-t p-3">
						{comments.map((c) => (
							<li key={c.id} className="text-sm">
								<span className="font-medium">
									{c.name?.trim() || "匿名访客"}
								</span>
								<span className="ml-2 text-white/50 text-xs">
									{formatTime(c.createdAt)}
								</span>
								<p className="mt-0.5 whitespace-pre-wrap text-white/90">
									{c.content}
								</p>
							</li>
						))}
					</ul>
				) : null}
			</div>
		</div>
	);
}
