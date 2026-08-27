import { Button } from "@photographer-proof-hub/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@photographer-proof-hub/ui/components/card";
import { Input } from "@photographer-proof-hub/ui/components/input";
import { Label } from "@photographer-proof-hub/ui/components/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	Copy,
	Download,
	ImageUp,
	Link2,
	Loader2,
	Trash2,
	UploadCloud,
} from "lucide-react";
import {
	type DragEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { PhotoCommentsDialog } from "@/components/photo-comments-dialog";
import {
	PhotoGridCard,
	type PhotoSummaryComment,
} from "@/components/photo-grid-card";
import { uploadPreview } from "@/lib/upload";
import { client, orpc } from "@/utils/orpc";
import {
	compressAndWatermark,
	DEFAULT_WATERMARK,
	toJpegFile,
	type WatermarkConfig,
} from "@/utils/watermark";

export const Route = createFileRoute("/_auth/gallery/$galleryId")({
	component: GalleryDetail,
});

type QueueStatus = "pending" | "processing" | "uploading" | "done" | "error";

type QueueItem = {
	id: string;
	file: File;
	status: QueueStatus;
	progress: number;
	previewUrl?: string;
	error?: string;
};

function ownerImageUrl(r2Key: string): string {
	const base = (
		import.meta.env.VITE_SERVER_URL ?? "http://localhost:3000"
	).replace(/\/+$/, "");
	// r2Key 形如 `${galleryId}/${photoId}.jpg`，含斜杠，作为通配路径原样拼接。
	return `${base}/img/owner/${r2Key}`;
}

function GalleryDetail() {
	const { galleryId } = Route.useParams();
	const queryClient = useQueryClient();

	const galleryQuery = useQuery(
		orpc.gallery.get.queryOptions({
			input: { id: galleryId },
		}),
	);
	const photosQuery = useQuery(
		orpc.photo.list.queryOptions({
			input: { galleryId },
		}),
	);
	const linksQuery = useQuery(
		orpc.shareLink.list.queryOptions({
			input: { galleryId },
		}),
	);

	const photoListKey = useMemo(
		() => orpc.photo.list.queryOptions({ input: { galleryId } }).queryKey,
		[galleryId],
	);

	// 每张图的选片汇总：标星数 + 评论列表，供网格直接展示「标星/评论」情况。
	const summaryQuery = useQuery(
		orpc.photo.summary.queryOptions({ input: { galleryId } }),
	);
	const summaryMap = useMemo(() => {
		const m = new Map<string, PhotoSummaryRow>();
		for (const row of summaryQuery.data ?? []) m.set(row.photoId, row);
		return m;
	}, [summaryQuery.data]);

	type PhotoSummaryRow = {
		photoId: string;
		originalFilename: string;
		r2Key: string;
		sortOrder: number;
		starCount: number;
		commentCount: number;
		comments: PhotoSummaryComment[];
	};

	// 复制原图文件名，便于摄影师去网盘按名检索原图。
	const copyFilename = useCallback((filename: string) => {
		void navigator.clipboard?.writeText(filename);
		toast.success("已复制文件名");
	}, []);

	const [commentsDialog, setCommentsDialog] = useState<{
		filename: string;
		comments: PhotoSummaryComment[];
	} | null>(null);

	// 水印配置：来自项目设置，缺失则回退默认。用 ref 避免在闭包中捕获过期值。
	const watermarkRef = useRef<WatermarkConfig>(DEFAULT_WATERMARK);
	watermarkRef.current = galleryQuery.data?.watermark ?? DEFAULT_WATERMARK;

	// ---- 上传队列 ----
	const [queue, setQueue] = useState<QueueItem[]>([]);
	const queueRef = useRef(queue);
	useEffect(() => {
		queueRef.current = queue;
	}, [queue]);

	const createdUrls = useRef<string[]>([]);
	useEffect(() => {
		const urls = createdUrls.current;
		return () => {
			for (const u of urls) URL.revokeObjectURL(u);
		};
	}, []);

	const processingRef = useRef(false);

	const drain = useCallback(async () => {
		if (processingRef.current) return;
		processingRef.current = true;
		try {
			const pending = queueRef.current.filter((q) => q.status === "pending");
			for (const item of pending) {
				setQueue((prev) =>
					prev.map((q) =>
						q.id === item.id && q.status === "pending"
							? { ...q, status: "processing" }
							: q,
					),
				);
				try {
					const processed = await compressAndWatermark(
						item.file,
						watermarkRef.current,
					);
					const previewUrl = URL.createObjectURL(processed.blob);
					createdUrls.current.push(previewUrl);
					setQueue((prev) =>
						prev.map((q) =>
							q.id === item.id
								? { ...q, previewUrl, status: "uploading", progress: 0 }
								: q,
						),
					);

					const uploadFile = toJpegFile(processed.blob, item.file.name);
					const result = await uploadPreview({
						galleryId,
						file: uploadFile,
						width: processed.width,
						height: processed.height,
						onProgress: (f) =>
							setQueue((prev) =>
								prev.map((q) => (q.id === item.id ? { ...q, progress: f } : q)),
							),
					});

					setQueue((prev) =>
						prev.map((q) =>
							q.id === item.id
								? {
										...q,
										status: "done",
										progress: 1,
										previewUrl: ownerImageUrl(result.r2Key),
									}
								: q,
						),
					);
					queryClient.invalidateQueries({ queryKey: photoListKey });
				} catch (err) {
					const message = err instanceof Error ? err.message : "处理失败";
					setQueue((prev) =>
						prev.map((q) =>
							q.id === item.id ? { ...q, status: "error", error: message } : q,
						),
					);
				}
			}
		} finally {
			processingRef.current = false;
			if (queueRef.current.some((q) => q.status === "pending")) {
				void drain();
			}
		}
	}, [galleryId, photoListKey, queryClient]);

	const addFiles = useCallback((files: FileList | File[]) => {
		const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
		if (images.length === 0) {
			toast.error("请选择图片文件");
			return;
		}
		setQueue((prev) => [
			...prev,
			...images.map((file) => ({
				id: crypto.randomUUID(),
				file,
				status: "pending" as const,
				progress: 0,
			})),
		]);
	}, []);

	const retry = useCallback((id: string) => {
		setQueue((prev) =>
			prev.map((q) =>
				q.id === id ? { ...q, status: "pending", error: undefined } : q,
			),
		);
	}, []);

	// 队列状态变化即触发处理：新文件入队、重试都会落到此处，
	// 由 processingRef 保证同一时刻只跑一个 drain 循环。
	useEffect(() => {
		if (queue.some((q) => q.status === "pending") && !processingRef.current) {
			void drain();
		}
	}, [queue, drain]);

	const removeQueued = useCallback((id: string) => {
		setQueue((prev) => prev.filter((q) => q.id !== id));
	}, []);

	// ---- 删除已上传图片 ----
	const deletePhoto = useMutation({
		mutationFn: (id: string) => client.photo.delete({ id }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: photoListKey });
			toast.success("图片已删除");
		},
		onError: (e) => toast.error(e.message || "删除失败"),
	});

	// ---- 拖拽排序 ----
	// 本地维护一份有序副本，拖拽时即时重排以保证手感，落库后再由服务端顺序回填。
	const [ordered, setOrdered] = useState(photosQuery.data ?? []);
	useEffect(() => {
		setOrdered(photosQuery.data ?? []);
	}, [photosQuery.data]);

	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

	const reorderPhotos = useMutation({
		mutationFn: (ids: string[]) =>
			client.photo.reorder({ galleryId, orderedIds: ids }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: photoListKey });
			toast.success("排序已保存");
		},
		onError: (e) => {
			setOrdered(photosQuery.data ?? []);
			toast.error(e.message || "排序保存失败");
		},
	});

	const handleDragStart = (i: number) => setDragIndex(i);
	const handleDragOver = (e: DragEvent, i: number) => {
		e.preventDefault();
		setDragOverIndex(i);
	};
	const handleDrop = (e: DragEvent, i: number) => {
		e.preventDefault();
		const from = dragIndex;
		setDragIndex(null);
		setDragOverIndex(null);
		if (from === null || from === i) return;
		const next = [...ordered];
		const [moved] = next.splice(from, 1);
		next.splice(i, 0, moved);
		setOrdered(next);
		reorderPhotos.mutate(next.map((p) => p.id));
	};
	const handleDragEnd = () => {
		setDragIndex(null);
		setDragOverIndex(null);
	};

	if (galleryQuery.isLoading) {
		return (
			<div className="mx-auto w-full max-w-5xl p-6 text-muted-foreground">
				加载中…
			</div>
		);
	}
	if (galleryQuery.isError) {
		return (
			<div className="mx-auto w-full max-w-5xl p-6">
				<p className="text-destructive">项目不存在或无权访问。</p>
				<Link to="/dashboard" className="text-primary underline">
					返回项目列表
				</Link>
			</div>
		);
	}

	const gallery = galleryQuery.data;
	if (!gallery) {
		return null;
	}
	const photos = photosQuery.data ?? [];
	const links = linksQuery.data ?? [];
	const wm = gallery.watermark;

	// ---- 导出标星清单（CSV）----
	// 定义为普通函数（非 Hook）：仅响应点击时执行，避免置于提前 return 之后引发的 Hooks 顺序错乱。
	const exportStars = async () => {
		try {
			const rows = await client.photo.stars({ galleryId });
			const escapeCsv = (value: string) => {
				if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
				return value;
			};
			const header = "原图文件名,标星数,访客标识\r\n";
			const body = rows
				.map(
					(r) =>
						`${escapeCsv(r.originalFilename)},${r.starCount},${escapeCsv(r.clientKeys.join("; "))}`,
				)
				.join("\r\n");
			// UTF-8 BOM 确保 Excel 正确识别中文编码。
			const csv = `﻿${header}${body}`;
			const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${gallery.name}-标星清单.csv`;
			a.click();
			URL.revokeObjectURL(url);
			toast.success(`已导出 ${rows.length} 张图片的标星数据`);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "导出失败");
		}
	};

	return (
		<div className="mx-auto w-full max-w-5xl space-y-8 p-6">
			{/* 头部 */}
			<div>
				<Link
					to="/dashboard"
					className="text-muted-foreground text-sm hover:text-foreground"
				>
					← 返回项目列表
				</Link>
				<div className="mt-2 flex items-start justify-between gap-4">
					<div>
						<h1 className="cn-font-heading font-bold text-2xl">
							{gallery.name}
						</h1>
						{gallery.description ? (
							<p className="mt-1 text-muted-foreground text-sm">
								{gallery.description}
							</p>
						) : null}
					</div>
					{wm?.enabled ? (
						<span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
							水印已启用
						</span>
					) : (
						<span className="inline-block rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
							无水印
						</span>
					)}
				</div>
			</div>

			{/* 上传区 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<UploadCloud /> 批量上传预览图
					</CardTitle>
					<CardDescription>
						原图仅在你的浏览器内缩放并烘焙平铺水印，低清预览图直传
						R2，原图永不离开本地。
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Dropzone onFiles={addFiles} />
					{queue.length > 0 ? (
						<ul className="space-y-2">
							{queue.map((item) => (
								<QueueRow
									key={item.id}
									item={item}
									onRetry={() => retry(item.id)}
									onRemove={() => removeQueued(item.id)}
								/>
							))}
						</ul>
					) : null}
				</CardContent>
			</Card>

			{/* 图片网格 */}
			<section className="space-y-3">
				<div className="flex items-center justify-between gap-2">
					<h2 className="font-semibold text-lg">
						已上传预览图（{photos.length}）
					</h2>
					<Button
						variant="outline"
						size="sm"
						onClick={exportStars}
						disabled={photos.length === 0}
					>
						<Download className="size-4" /> 导出标星清单
					</Button>
				</div>
				{photosQuery.isLoading ? (
					<p className="text-muted-foreground text-sm">加载中…</p>
				) : photos.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						还没有预览图，先从上方上传吧。
					</p>
				) : (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
						{ordered.map((p, i) => {
							const sum = summaryMap.get(p.id);
							return (
								<PhotoGridCard
									key={p.id}
									index={i}
									src={ownerImageUrl(p.r2Key)}
									originalFilename={p.originalFilename}
									starCount={sum?.starCount ?? 0}
									commentCount={sum?.commentCount ?? 0}
									isDragging={dragIndex === i}
									isDragOver={
										dragOverIndex === i && dragIndex !== null && dragIndex !== i
									}
									onDragStart={handleDragStart}
									onDragOver={handleDragOver}
									onDrop={handleDrop}
									onDragEnd={handleDragEnd}
									onCopy={copyFilename}
									onDelete={() => {
										if (window.confirm(`删除「${p.originalFilename}」？`)) {
											deletePhoto.mutate(p.id);
										}
									}}
									onShowComments={() =>
										setCommentsDialog({
											filename: p.originalFilename,
											comments: sum?.comments ?? [],
										})
									}
								/>
							);
						})}
					</div>
				)}
				{commentsDialog ? (
					<PhotoCommentsDialog
						filename={commentsDialog.filename}
						comments={commentsDialog.comments}
						onClose={() => setCommentsDialog(null)}
					/>
				) : null}
			</section>

			{/* 分享链接 */}
			<SharePanel
				galleryId={galleryId}
				links={links}
				queryClient={queryClient}
				linksQueryInvalidate={() =>
					queryClient.invalidateQueries({
						queryKey: orpc.shareLink.list.queryOptions({ input: { galleryId } })
							.queryKey,
					})
				}
			/>
		</div>
	);
}

function Dropzone({
	onFiles,
}: {
	onFiles: (files: FileList | File[]) => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	return (
		<button
			type="button"
			onClick={() => inputRef.current?.click()}
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
			}}
			className={`flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
				dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"
			}`}
		>
			<ImageUp className="size-8 text-muted-foreground" />
			<p className="font-medium text-sm">点击选择，或拖拽图片到此处</p>
			<p className="text-muted-foreground text-xs">
				支持多选 · JPG / PNG / HEIC 等
			</p>
			<input
				ref={inputRef}
				type="file"
				accept="image/*"
				multiple
				hidden
				onChange={(e) => {
					if (e.target.files?.length) onFiles(e.target.files);
					e.target.value = "";
				}}
			/>
		</button>
	);
}

function QueueRow({
	item,
	onRetry,
	onRemove,
}: {
	item: QueueItem;
	onRetry: () => void;
	onRemove: () => void;
}) {
	const pct = Math.round(item.progress * 100);
	return (
		<li className="flex items-center gap-3 rounded-xl border p-2">
			{item.previewUrl ? (
				<img
					src={item.previewUrl}
					alt=""
					className="size-10 shrink-0 rounded-lg object-cover"
				/>
			) : (
				<div className="size-10 shrink-0 bg-muted" />
			)}

			<div className="min-w-0 flex-1">
				<p className="truncate text-sm">{item.file.name}</p>
				<div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
					<div
						className={`h-full transition-all ${
							item.status === "error" ? "bg-destructive" : "bg-primary"
						}`}
						style={{ width: `${item.status === "done" ? 100 : pct}%` }}
					/>
				</div>
				<p className="mt-0.5 text-muted-foreground text-xs">
					{item.status === "pending" && "等待处理…"}
					{item.status === "processing" && "压缩 + 烘焙水印中…"}
					{item.status === "uploading" && `上传中 ${pct}%`}
					{item.status === "done" && "已完成"}
					{item.status === "error" && (
						<span className="text-destructive">{item.error ?? "失败"}</span>
					)}
				</p>
			</div>

			<StatusIcon status={item.status} />
			{item.status === "error" ? (
				<Button variant="outline" size="sm" onClick={onRetry}>
					重试
				</Button>
			) : null}
			{item.status === "pending" || item.status === "error" ? (
				<Button
					variant="ghost"
					size="icon"
					aria-label="移除"
					onClick={onRemove}
				>
					<Trash2 className="size-4" />
				</Button>
			) : null}
		</li>
	);
}

function StatusIcon({ status }: { status: QueueStatus }) {
	if (status === "done")
		return <CheckCircle2 className="size-5 text-primary" />;
	if (status === "error")
		return <AlertCircle className="size-5 text-destructive" />;
	if (status === "pending" || status === "uploading" || status === "processing")
		return <Loader2 className="size-5 animate-spin text-muted-foreground" />;
	return null;
}

function SharePanel({
	galleryId,
	links,
	queryClient,
	linksQueryInvalidate,
}: {
	galleryId: string;
	links: {
		id: string;
		url: string;
		hasAccessCode: boolean;
		isActive: boolean;
		expiresAt: Date | null;
		createdAt: Date;
	}[];
	queryClient: ReturnType<typeof useQueryClient>;
	linksQueryInvalidate: () => void;
}) {
	const [accessCode, setAccessCode] = useState("");
	const [expiryDays, setExpiryDays] = useState("");

	const createLink = useMutation({
		mutationFn: () =>
			client.shareLink.create({
				galleryId,
				accessCode: accessCode.trim() || undefined,
				expiresAt: expiryDays.trim()
					? new Date(Date.now() + Number(expiryDays) * 86_400_000)
					: undefined,
			}),
		onSuccess: (link) => {
			queryClient.invalidateQueries({
				queryKey: orpc.shareLink.list.queryOptions({ input: { galleryId } })
					.queryKey,
			});
			linksQueryInvalidate();
			void navigator.clipboard?.writeText(link.url);
			toast.success("分享链接已创建并复制");
			setAccessCode("");
			setExpiryDays("");
		},
		onError: (e) => toast.error(e.message || "创建失败"),
	});

	const disableLink = useMutation({
		mutationFn: (id: string) => client.shareLink.disable({ id }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.shareLink.list.queryOptions({ input: { galleryId } })
					.queryKey,
			});
			linksQueryInvalidate();
			toast.success("链接已关闭");
		},
		onError: (e) => toast.error(e.message || "操作失败"),
	});

	const copy = (url: string) => {
		void navigator.clipboard?.writeText(url);
		toast.success("已复制链接");
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Link2 /> 分享链接
				</CardTitle>
				<CardDescription>
					生成客户免登录访问链接，可设提取码与有效期；关闭后客户立即失效。
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3 sm:grid-cols-3">
					<div className="space-y-1.5">
						<Label htmlFor="accessCode">提取码（可选）</Label>
						<Input
							id="accessCode"
							value={accessCode}
							placeholder="留空则无需提取码"
							onChange={(e) => setAccessCode(e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="expiryDays">有效期（天，可选）</Label>
						<Input
							id="expiryDays"
							type="number"
							min={1}
							value={expiryDays}
							placeholder="留空则长期有效"
							onChange={(e) => setExpiryDays(e.target.value)}
						/>
					</div>
					<div className="flex items-end">
						<Button
							className="w-full"
							onClick={() => createLink.mutate()}
							disabled={createLink.isPending}
						>
							{createLink.isPending ? "创建中…" : "生成分享链接"}
						</Button>
					</div>
				</div>

				{links.length > 0 ? (
					<ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
						{links.map((link) => (
							<li
								key={link.id}
								className="flex flex-wrap items-center justify-between gap-2 p-3"
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<code className="truncate text-sm">{link.url}</code>
										<button
											type="button"
											aria-label="复制"
											className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
											onClick={() => copy(link.url)}
										>
											<Copy className="size-4" />
										</button>
									</div>
									<div className="mt-1 flex flex-wrap gap-2 text-xs">
										{link.hasAccessCode ? (
											<span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-primary">
												需提取码
											</span>
										) : (
											<span className="rounded-full bg-muted px-1.5 py-0.5 text-muted-foreground">
												无提取码
											</span>
										)}
										{link.isActive ? (
											<span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-emerald-600">
												有效
											</span>
										) : (
											<span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-destructive">
												已关闭
											</span>
										)}
										{link.expiresAt ? (
											<span className="text-muted-foreground">
												过期：
												{new Intl.DateTimeFormat("zh-CN", {
													dateStyle: "medium",
												}).format(new Date(link.expiresAt))}
											</span>
										) : null}
									</div>
								</div>
								{link.isActive ? (
									<Button
										variant="outline"
										size="sm"
										disabled={disableLink.isPending}
										onClick={() => disableLink.mutate(link.id)}
									>
										关闭
									</Button>
								) : (
									<Button variant="ghost" size="sm" disabled>
										已失效
									</Button>
								)}
							</li>
						))}
					</ul>
				) : (
					<p className="text-muted-foreground text-sm">还没有分享链接。</p>
				)}
			</CardContent>
		</Card>
	);
}
