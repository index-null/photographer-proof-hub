import { X } from "lucide-react";

import type { PhotoSummaryComment } from "./photo-grid-card";

function formatTime(d: Date): string {
	return new Intl.DateTimeFormat("zh-CN", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(d));
}

export function PhotoCommentsDialog({
	filename,
	comments,
	onClose,
}: {
	filename: string;
	comments: PhotoSummaryComment[];
	onClose: () => void;
}) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: 弹窗遮罩，点击空白区域关闭，非可聚焦元素
		// biome-ignore lint/a11y/useKeyWithClickEvents: 弹窗关闭由父级状态控制，遮罩点击关闭无需键盘事件
		<div
			className="fade-in-0 fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-sm duration-200"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="fade-in-0 zoom-in-[0.98] flex max-h-[80vh] w-full max-w-md animate-in flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border duration-200 ease-emphasized">
				<header className="flex items-center justify-between gap-3 border-b px-5 py-4">
					<div className="min-w-0">
						<p className="text-muted-foreground text-xs">图片评论</p>
						<p className="mt-0.5 truncate text-sm">{filename}</p>
					</div>
					<button
						type="button"
						aria-label="关闭"
						onClick={onClose}
						className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
					>
						<X className="size-4" />
					</button>
				</header>

				<div className="flex-1 space-y-2 overflow-y-auto p-4">
					{comments.length === 0 ? (
						<p className="py-10 text-center text-muted-foreground text-sm">
							这张图还没有评论
						</p>
					) : (
						comments.map((c) => (
							<div key={c.id} className="rounded-xl bg-muted/40 p-4">
								<div className="flex items-center justify-between gap-2">
									<span className="text-sm">
										{c.name?.trim() || "匿名访客"}
									</span>
									<span className="text-muted-foreground text-xs tabular-nums">
										{formatTime(c.createdAt)}
									</span>
								</div>
								<p className="mt-1.5 whitespace-pre-wrap text-muted-foreground text-sm leading-relaxed">
									{c.content}
								</p>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
