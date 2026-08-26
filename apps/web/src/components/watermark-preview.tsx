import { useEffect, useRef } from "react";

import { drawWatermark, type WatermarkConfig } from "@/utils/watermark";

/** 实时平铺水印预览：在模拟照片背景上绘制当前水印配置。 */
export default function WatermarkPreview({
	config,
	className,
}: {
	config: WatermarkConfig;
	className?: string;
}) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) {
			return;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			return;
		}

		const { width, height } = canvas;

		// 模拟一张照片的渐变背景，便于观察水印对比度
		const bg = ctx.createLinearGradient(0, 0, width, height);
		bg.addColorStop(0, "#0f172a");
		bg.addColorStop(0.5, "#334155");
		bg.addColorStop(1, "#0f172a");
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, width, height);

		drawWatermark(ctx, config, width, height);
	}, [config]);

	return (
		<canvas
			ref={canvasRef}
			width={320}
			height={200}
			className={`block w-full rounded-none ring-1 ring-foreground/10 ${className ?? ""}`}
		/>
	);
}
