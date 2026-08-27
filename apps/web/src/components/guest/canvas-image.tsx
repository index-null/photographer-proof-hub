import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";

import { buildImageUrl } from "@/lib/guest";

/** 同 r2Key 的预览图 blob URL 跨组件复用，避免重复下载。 */
const blobCache = new Map<string, string>();

async function loadBlob(r2Key: string, url: string): Promise<string> {
	const cached = blobCache.get(r2Key);
	if (cached) return cached;
	const res = await fetch(url);
	if (!res.ok) throw new Error("图片加载失败");
	const blob = await res.blob();
	const objUrl = URL.createObjectURL(blob);
	blobCache.set(r2Key, objUrl);
	return objUrl;
}

type Fit = "cover" | "contain";

/**
 * 以 Canvas 绘制预览图（非裸 `<img>`），避免浏览器原生「另存为 / 长按保存」。
 * 配合父级 `useAntiTheft` 的全局拦截，构成客户侧防盗的第一道门槛。
 *
 * - 懒加载：进入视口（含 200px 预加载边距）才发起请求，移动端流量友好。
 * - 渲染：blob URL 同源，Canvas 不污染，按 DPR 绘制保证高清。
 */
export function CanvasImage({
	r2Key,
	token,
	className,
	fit = "cover",
	onReady,
}: {
	r2Key: string;
	token: string;
	className?: string;
	fit?: Fit;
	onReady?: () => void;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const imgRef = useRef<HTMLImageElement | null>(null);
	const [loaded, setLoaded] = useState(false);

	const draw = useCallback(() => {
		const canvas = canvasRef.current;
		const img = imgRef.current;
		if (!canvas || !img) return;
		const rect = canvas.getBoundingClientRect();
		const cw = Math.max(1, Math.round(rect.width));
		const ch = Math.max(1, Math.round(rect.height));
		const dpr = window.devicePixelRatio || 1;
		canvas.width = Math.round(cw * dpr);
		canvas.height = Math.round(ch * dpr);

		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const iw = img.naturalWidth;
		const ih = img.naturalHeight;
		const scale =
			fit === "contain"
				? Math.min(canvas.width / iw, canvas.height / ih)
				: Math.max(canvas.width / iw, canvas.height / ih);
		const dw = iw * scale;
		const dh = ih * scale;
		const dx = (canvas.width - dw) / 2;
		const dy = (canvas.height - dh) / 2;
		ctx.drawImage(img, dx, dy, dw, dh);
	}, [fit]);

	const ensureImage = useCallback(async () => {
		if (imgRef.current) {
			draw();
			return;
		}
		try {
			const objUrl = await loadBlob(r2Key, buildImageUrl(r2Key, token));
			const img = new Image();
			img.onload = () => {
				imgRef.current = img;
				setLoaded(true);
				draw();
				onReady?.();
			};
			img.src = objUrl;
		} catch {
			// 加载失败静默：防盗页不应暴露后端报错细节。
		}
	}, [r2Key, token, draw, onReady]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					void ensureImage();
					io.disconnect();
				}
			},
			{ rootMargin: "200px" },
		);
		io.observe(canvas);
		const ro = new ResizeObserver(() => draw());
		ro.observe(canvas);
		return () => {
			io.disconnect();
			ro.disconnect();
		};
	}, [ensureImage, draw]);

	const stop = (e: React.SyntheticEvent) => {
		e.preventDefault();
		return false;
	};

	return (
		<canvas
			ref={canvasRef}
			draggable={false}
			onContextMenu={stop}
			onDragStart={stop}
			className={cn("block h-full w-full", loaded ? "" : "bg-muted", className)}
			style={{
				touchAction: "none",
				userSelect: "none",
				WebkitUserSelect: "none",
				WebkitTouchCallout: "none",
			}}
		/>
	);
}
