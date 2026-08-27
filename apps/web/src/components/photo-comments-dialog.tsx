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
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-background shadow-lg">
				<header className="flex items-center justify-between gap-2 border-b p-3">
					<div className="min-w-0">
						<p className="text-muted-foreground text-xs">图片评论</p>
						<p className="truncate font-medium text-sm">{filename}</p>
					</div>
					<button
						type="button"
						aria-label="关闭"
						onClick={onClose}
						className="rounded-none p-1 text-muted-foreground hover:bg-muted"
					>
						<X className="size-5" />
					</button>
				</header>
				<div className="flex-1 space-y-3 overflow-y-auto p-3">
					{comments.length === 0 ? (
						<p className="py-8 text-center text-muted-foreground text-sm">
							这张图还没有评论
						</p>
					) : (
						comments.map((c) => (
							<div key={c.id} className="rounded-none border bg-card p-3">
								<div className="flex items-center justify-between gap-2">
									<span className="font-medium text-sm">
										{c.name?.trim() || "匿名访客"}
									</span>
									<span className="text-muted-foreground text-xs">
										{formatTime(c.createdAt)}
									</span>
								</div>
								<p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
