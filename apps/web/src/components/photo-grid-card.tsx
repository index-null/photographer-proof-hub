import { Button } from "@photographer-proof-hub/ui/components/button";
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
			className={`group relative aspect-square overflow-hidden rounded-none border bg-muted ${
				isDragging ? "opacity-40" : ""
			} ${isDragOver ? "ring-2 ring-primary ring-inset" : ""}`}
		>
			<img
				src={src}
				alt={originalFilename}
				loading="lazy"
				draggable={false}
				className="h-full w-full object-cover"
			/>

			<span
				className="absolute top-1 left-1 cursor-grab text-white/80 drop-shadow"
				title="拖拽排序"
			>
				<GripVertical className="size-4" />
			</span>

			<div className="absolute top-1 right-1 flex items-center gap-1">
				<span
					className="flex items-center gap-0.5 rounded-none bg-black/55 px-1.5 py-0.5 text-white text-xs"
					title="标星数"
				>
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
						className="flex items-center gap-0.5 rounded-none bg-black/55 px-1.5 py-0.5 text-white text-xs hover:bg-black/75"
					>
						<MessageSquare className="size-3.5" />
						{commentCount}
					</button>
				) : null}
			</div>

			<div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-black/55 px-2 py-1 text-white text-xs">
				<span className="truncate" title={originalFilename}>
					{originalFilename}
				</span>
				<div className="flex shrink-0 items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="复制文件名"
						className="size-6 text-white hover:bg-white/20 hover:text-white"
						onClick={() => onCopy(originalFilename)}
					>
						<Copy className="size-4" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="删除图片"
						className="size-6 text-white hover:bg-white/20 hover:text-destructive"
						onClick={onDelete}
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
