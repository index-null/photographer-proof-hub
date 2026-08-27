import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { Images, MessageSquare, Star } from "lucide-react";
import { useState } from "react";

import { CanvasImage } from "./canvas-image";
import { CommentPanel } from "./comment-panel";
import { Lightbox } from "./lightbox";
import type { GuestGallery, GuestPhoto } from "./use-guest";

function TabButton({
	active,
	onClick,
	icon: Icon,
	children,
}: {
	active: boolean;
	onClick: () => void;
	icon: typeof Images;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				"flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2 font-medium text-xs transition-colors",
				active
					? "border-primary text-foreground"
					: "border-transparent text-muted-foreground hover:text-foreground",
			)}
		>
			<Icon className="size-4" />
			{children}
		</button>
	);
}

/**
 * 客户浏览主页：照片网格（Canvas 渲染 + 标星）+ 留言面板 + 大图灯箱。
 * 移动端优先（375px 宽），桌面端自动放宽列数。
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
	const [tab, setTab] = useState<"photos" | "comments">("photos");
	const [lightbox, setLightbox] = useState<number | null>(null);
	const starredCount = photos.filter((p) => p.starred).length;

	const handleStar = (photoId: string, current: boolean) =>
		onToggleStar(photoId, current);

	return (
		<div className="mx-auto flex min-h-full max-w-3xl flex-col">
			<header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
				<div className="flex items-start justify-between gap-3 p-3">
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
					<div className="flex shrink-0 items-center gap-1 rounded-none bg-muted px-2 py-1 text-xs">
						<Star className="size-3.5 text-primary" />
						{starredCount}/{photos.length}
					</div>
				</div>
				<div className="flex gap-1">
					<TabButton
						active={tab === "photos"}
						onClick={() => setTab("photos")}
						icon={Images}
					>
						照片
					</TabButton>
					<TabButton
						active={tab === "comments"}
						onClick={() => setTab("comments")}
						icon={MessageSquare}
					>
						留言
					</TabButton>
				</div>
			</header>

			<main className="flex-1">
				{tab === "photos" ? (
					photos.length === 0 ? (
						<div className="py-16 text-center text-muted-foreground text-sm">
							这个选片项目还没有照片。
						</div>
					) : (
						<div className="grid grid-cols-2 gap-1.5 p-1.5 sm:grid-cols-3">
							{photos.map((p, i) => (
								<div
									key={p.id}
									className="group relative aspect-square overflow-hidden bg-muted"
								>
									<button
										type="button"
										onClick={() => setLightbox(i)}
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
								</div>
							))}
						</div>
					)
				) : (
					<CommentPanel slug={slug} token={token} clientKey={clientKey} />
				)}
			</main>

			{lightbox !== null ? (
				<Lightbox
					photos={photos}
					index={lightbox}
					token={token}
					slug={slug}
					clientKey={clientKey}
					onClose={() => setLightbox(null)}
					onNavigate={(d) =>
						setLightbox((prev) =>
							prev === null ? prev : (prev + d + photos.length) % photos.length,
						)
					}
					onStarred={handleStar}
				/>
			) : null}
		</div>
	);
}
