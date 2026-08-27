import { Button } from "@photographer-proof-hub/ui/components/button";
import { Input } from "@photographer-proof-hub/ui/components/input";
import { Textarea } from "@photographer-proof-hub/ui/components/textarea";
import {
	ChevronLeft,
	ChevronRight,
	MessageSquare,
	Star,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { client } from "@/utils/orpc";
import { CanvasImage } from "./canvas-image";
import type { GuestPhoto } from "./use-guest";

/**
 * 大图查看器（灯箱）：Canvas 渲染 + 左右切换 + 标星 + 针对单张留言。
 * 键盘：`Esc` 关闭、`←/→` 切换。
 */
export function Lightbox({
	photos,
	index,
	token,
	slug,
	clientKey,
	onClose,
	onNavigate,
	onStarred,
}: {
	photos: GuestPhoto[];
	index: number;
	token: string;
	slug: string;
	clientKey: string;
	onClose: () => void;
	onNavigate: (delta: number) => void;
	onStarred: (photoId: string, current: boolean) => Promise<boolean>;
}) {
	const photo = photos[index];
	const [commenting, setCommenting] = useState(false);
	const [name, setName] = useState("");
	const [content, setContent] = useState("");
	const [posting, setPosting] = useState(false);

	// 切换图片时重置留言输入态：在导航动作里同步复位，避免使用未读取依赖的 effect。
	const navigate = useCallback(
		(delta: number) => {
			onNavigate(delta);
			setCommenting(false);
			setContent("");
		},
		[onNavigate],
	);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
			else if (e.key === "ArrowLeft") navigate(-1);
			else if (e.key === "ArrowRight") navigate(1);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose, navigate]);

	const toggleStar = async () => {
		await onStarred(photo.id, photo.starred);
	};

	const postComment = async () => {
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
			setContent("");
			setCommenting(false);
		} catch {
			toast.error("留言提交失败");
		} finally {
			setPosting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-black/95">
			<div className="flex items-center justify-between p-3 text-white">
				<button
					type="button"
					aria-label="关闭"
					onClick={onClose}
					className="rounded-none p-1 hover:bg-white/10"
				>
					<X className="size-5" />
				</button>
				<span className="text-white/70 text-xs">
					{index + 1} / {photos.length}
				</span>
				<button
					type="button"
					aria-label="标星"
					onClick={() => void toggleStar()}
					className="rounded-none p-1 hover:bg-white/10"
				>
					<Star
						className={
							photo.starred
								? "size-5 fill-yellow-400 text-yellow-400"
								: "size-5 text-white/80"
						}
					/>
				</button>
			</div>

			<div className="relative flex-1">
				<CanvasImage
					r2Key={photo.r2Key}
					token={token}
					fit="contain"
					className="h-full w-full"
				/>
				<button
					type="button"
					aria-label="上一张"
					onClick={() => navigate(-1)}
					className="absolute top-1/2 left-1 -translate-y-1/2 rounded-none bg-black/40 p-2 text-white hover:bg-black/60"
				>
					<ChevronLeft className="size-6" />
				</button>
				<button
					type="button"
					aria-label="下一张"
					onClick={() => navigate(1)}
					className="absolute top-1/2 right-1 -translate-y-1/2 rounded-none bg-black/40 p-2 text-white hover:bg-black/60"
				>
					<ChevronRight className="size-6" />
				</button>
			</div>

			<div className="border-white/10 border-t p-3 text-white">
				{commenting ? (
					<div className="space-y-2">
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
					<Button
						variant="ghost"
						className="text-white hover:bg-white/10"
						onClick={() => setCommenting(true)}
					>
						<MessageSquare className="size-4" />
						留言给这张
					</Button>
				)}
			</div>
		</div>
	);
}
