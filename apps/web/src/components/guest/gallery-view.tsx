import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Home, MessageSquare, Star } from "lucide-react";
import { useMemo, useState } from "react";
import { orpc } from "@/utils/orpc";
import { CanvasImage } from "./canvas-image";
import { Lightbox } from "./lightbox";
import type { GuestComment, GuestGallery, GuestPhoto } from "./use-guest";

type ViewMode = "all" | "starred";

/**
 * 客户浏览主页：照片网格（Canvas 渲染 + 标星）+ 大图灯箱（按图评论）。
 * 评论严格绑定到具体图片（无「整组留言」），移动端优先。
 * 顶部支持「全部 / 已收藏」切换，灯箱内的导航随之在对应范围内循环。
 */
export function GalleryView({
	gallery,
	photos,
	token,
	slug,
	clientKey,
	onToggleStar,
}: {
	gallery: GuestGallery;
	photos: GuestPhoto[];
	token: string;
	slug: string;
	clientKey: string;
	onToggleStar: (photoId: string, current: boolean) => Promise<boolean>;
}) {
	const [lightboxId, setLightboxId] = useState<string | null>(null);
	const [view, setView] = useState<ViewMode>("all");
	const starredCount = photos.filter((p) => p.starred).length;

	// 当前视图下可见的照片（「已收藏」仅含标星项）。
	const visiblePhotos = useMemo(
		() => (view === "starred" ? photos.filter((p) => p.starred) : photos),
		[view, photos],
	);

	// 拉取该链接下全部评论（含 photoId），按图分组后供网格徽标与灯箱展示。
	const commentsQuery = useQuery(
		orpc.guest.comments.queryOptions({ input: { slug, viewToken: token } }),
	);
	const commentsByPhoto = useMemo(() => {
		const m = new Map<string, GuestComment[]>();
		for (const c of (commentsQuery.data ?? []) as GuestComment[]) {
			if (!c.photoId) continue;
			let arr = m.get(c.photoId);
			if (!arr) {
				arr = [];
				m.set(c.photoId, arr);
			}
			arr.push(c);
		}
		return m;
	}, [commentsQuery.data]);

	const handleStar = (photoId: string, current: boolean) =>
		onToggleStar(photoId, current);

	const refreshComments = () => commentsQuery.refetch();

	return (
		<div className="mx-auto flex min-h-full max-w-3xl flex-col">
			<header className="sticky top-0 z-10 border-border border-b bg-background/80 backdrop-blur-xl">
				<div className="flex items-start justify-between gap-3 p-3">
					<div className="flex min-w-0 items-center gap-2">
						<Link
							to="/"
							aria-label="返回首页"
							className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<Home className="size-4" />
						</Link>
						<div className="min-w-0">
							<h1 className="cn-font-heading truncate font-semibold text-base">
								{gallery.name}
							</h1>
							{gallery.description ? (
								<p className="truncate text-muted-foreground text-xs">
									{gallery.description}
								</p>
							) : null}
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
						<Star className="size-3.5 text-primary" />
						{starredCount}/{photos.length}
					</div>
				</div>

				{/* 全部 / 已收藏 切换 */}
				<div className="flex items-center gap-1.5 px-3 pb-2">
					<div className="flex shrink-0 rounded-xl border border-border p-0.5 text-xs">
						<button
							type="button"
							onClick={() => setView("all")}
							className={cn(
								"rounded-lg px-2.5 py-1 transition-colors",
								view === "all"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							全部
						</button>
						<button
							type="button"
							onClick={() => setView("starred")}
							className={cn(
								"flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors",
								view === "starred"
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							<Star
								className={
									view === "starred" ? "size-3.5 fill-current" : "size-3.5"
								}
							/>
							已收藏 {starredCount}
						</button>
					</div>
				</div>
			</header>

			<main className="flex-1">
				{visiblePhotos.length === 0 ? (
					<div className="py-16 text-center text-muted-foreground text-sm">
						{view === "starred"
							? "还没有收藏的照片，点击照片右上角的星标即可收藏。"
							: "这个选片项目还没有照片。"}
					</div>
				) : (
					<div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
						{visiblePhotos.map((p) => {
							const count = commentsByPhoto.get(p.id)?.length ?? 0;
							return (
								<div
									key={p.id}
									className="group relative aspect-square overflow-hidden bg-muted"
								>
									<button
										type="button"
										onClick={() => setLightboxId(p.id)}
										draggable={false}
										aria-label={`查看 ${p.originalFilename}`}
										className="block h-full w-full"
									>
										<CanvasImage r2Key={p.r2Key} token={token} />
									</button>
									<button
										type="button"
										aria-label={p.starred ? "取消标星" : "标星"}
										onClick={(e) => {
											e.stopPropagation();
											void handleStar(p.id, p.starred);
										}}
										className="absolute top-1.5 right-1.5 rounded-full bg-black/45 p-1.5 backdrop-blur transition-colors hover:bg-black/65"
									>
										<Star
											className={
												p.starred
													? "size-4 fill-yellow-400 text-yellow-400"
													: "size-4 text-white"
											}
										/>
									</button>
									{count > 0 ? (
										<span className="absolute bottom-1.5 left-1.5 flex items-center gap-0.5 rounded-full bg-black/55 px-1.5 py-0.5 text-white text-xs">
											<MessageSquare className="size-3.5" />
											{count}
										</span>
									) : null}
								</div>
							);
						})}
					</div>
				)}
			</main>

			{lightboxId !== null ? (
				<Lightbox
					photos={visiblePhotos}
					initialId={lightboxId}
					token={token}
					slug={slug}
					clientKey={clientKey}
					commentsByPhoto={commentsByPhoto}
					view={view}
					onViewChange={setView}
					onCommentAdded={refreshComments}
					onClose={() => setLightboxId(null)}
					onStarred={handleStar}
				/>
			) : null}
		</div>
	);
}
