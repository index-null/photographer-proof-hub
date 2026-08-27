import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { Copy, GripVertical, MessageSquare, Star, Trash2 } from "lucide-react";
import type { DragEvent } from "react";

export type PhotoSummaryComment = {
	id: string;
	name: string | null;
	content: string;
	createdAt: Date;
};

export type PhotoGridCardProps = {
	index: number;
	src: string;
	originalFilename: string;
	starCount: number;
	commentCount: number;
	isDragging: boolean;
	isDragOver: boolean;
	onDragStart: (i: number) => void;
	onDragOver: (e: DragEvent, i: number) => void;
	onDrop: (e: DragEvent, i: number) => void;
	onDragEnd: () => void;
	onCopy: (filename: string) => void;
	onDelete: () => void;
	onShowComments: () => void;
};

/** 覆盖在图片上的小圆角控件底色：半透明 + 背景模糊，不使用发光。 */
const overlayChip =
	"flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 text-white text-xs backdrop-blur-sm";

export function PhotoGridCard({
	index,
	src,
	originalFilename,
	starCount,
	commentCount,
	isDragging,
	isDragOver,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
	onCopy,
	onDelete,
	onShowComments,
}: PhotoGridCardProps) {
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: 拖拽排序网格项，含标星/评论/删除按钮，键盘 DnD 超出本迭代范围
		<div
			draggable
			onDragStart={() => onDragStart(index)}
			onDragOver={(e) => onDragOver(e, index)}
			onDrop={(e) => onDrop(e, index)}
			onDragEnd={onDragEnd}
			className={cn(
				"group relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-all duration-200 ease-emphasized",
				isDragging && "opacity-40",
				isDragOver && "ring-2 ring-foreground/60",
			)}
		>
			<img
				src={src}
				alt={originalFilename}
				loading="lazy"
				draggable={false}
				className="h-full w-full object-cover transition-transform duration-500 ease-emphasized group-hover:scale-[1.03]"
			/>

			<span
				className="absolute top-2 left-2 cursor-grab text-white/70 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
				title="拖拽排序"
			>
				<GripVertical className="size-4" />
			</span>

			<div className="absolute top-2 right-2 flex items-center gap-1">
				<span className={overlayChip} title="标星数">
					<Star
						className={
							starCount > 0
								? "size-3.5 fill-yellow-400 text-yellow-400"
								: "size-3.5"
						}
					/>
					{starCount}
				</span>
				{commentCount > 0 ? (
					<button
						type="button"
						aria-label="查看评论"
						onClick={onShowComments}
						className={cn(
							overlayChip,
							"transition-colors duration-200 hover:bg-black/65",
						)}
					>
						<MessageSquare className="size-3.5" />
						{commentCount}
					</button>
				) : null}
			</div>

			{/* 底部信息条：默认收起，悬停时上滑显现，避免长期遮挡画面 */}
			<div className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-between gap-2 bg-linear-to-t from-black/80 to-black/40 px-3 py-2 text-white text-xs opacity-0 transition-all duration-300 ease-emphasized group-hover:translate-y-0 group-hover:opacity-100">
				<span className="truncate font-light" title={originalFilename}>
					{originalFilename}
				</span>
				<div className="flex shrink-0 items-center gap-0.5">
					<button
						type="button"
						aria-label="复制文件名"
						className="flex size-7 items-center justify-center rounded-full text-white/80 transition-colors duration-200 hover:bg-white/15 hover:text-white"
						onClick={() => onCopy(originalFilename)}
					>
						<Copy className="size-4" />
					</button>
					<button
						type="button"
						aria-label="删除图片"
						className="flex size-7 items-center justify-center rounded-full text-white/80 transition-colors duration-200 hover:bg-white/15 hover:text-red-300"
						onClick={onDelete}
					>
						<Trash2 className="size-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
