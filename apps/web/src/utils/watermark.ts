export type WatermarkConfig = {
	text: string;
	color: string;
	opacity: number;
	fontSize: number;
	rotation: number;
	gapX: number;
	gapY: number;
	enabled: boolean;
};

export const DEFAULT_WATERMARK: WatermarkConfig = {
	text: "PROOF © Photographer",
	color: "#ffffff",
	opacity: 0.3,
	fontSize: 24,
	rotation: -30,
	gapX: 140,
	gapY: 140,
	enabled: true,
};

/**
 * 在已绘制好背景的 ctx 上平铺绘制旋转水印。
 * 通过整体旋转坐标系后沿对角线范围铺网格，保证任意旋转角下整幅全覆盖。
 */
export function drawWatermark(
	ctx: CanvasRenderingContext2D,
	config: WatermarkConfig,
	width: number,
	height: number,
): void {
	if (!config.enabled || !config.text.trim()) {
		return;
	}

	const { text, color, opacity, fontSize, rotation, gapX, gapY } = config;

	ctx.save();
	ctx.globalAlpha = Math.min(Math.max(opacity, 0), 1);
	ctx.fillStyle = color;
	ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, -apple-system, sans-serif`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	const rad = (rotation * Math.PI) / 180;
	ctx.translate(width / 2, height / 2);
	ctx.rotate(rad);

	const diag = Math.sqrt(width * width + height * height);
	const stepX = Math.max(gapX, 1);
	const stepY = Math.max(gapY, 1);
	for (let y = -diag; y <= diag; y += stepY) {
		for (let x = -diag; x <= diag; x += stepX) {
			ctx.fillText(text, x, y);
		}
	}

	ctx.restore();
}

export type ProcessedImage = {
	/** 浏览器端压缩 + 平铺水印后的低清 JPEG。 */
	blob: Blob;
	/** 处理后像素尺寸（用于回传服务端记录，便于后续清单/网格展示）。 */
	width: number;
	height: number;
};

export type CompressOptions = {
	/** 长边上限（px），默认 1600。原图长边超过此值才缩放。 */
	maxEdge?: number;
	/** JPEG 导出质量，默认 0.7。 */
	quality?: number;
};

function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
	quality: number,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("图片导出失败"));
			},
			type,
			quality,
		);
	});
}

/**
 * 浏览器端将原始照片缩放 + 平铺水印 + 导出低清 JPEG。
 *
 * - EXIF 方向：使用 `createImageBitmap(file, { imageOrientation: "from-image" })`
 *   自动按 EXIF orientation 校正，避免手机/相机竖拍照片在 Canvas 上被旋转。
 * - 缩放：仅当原图长边超过 `maxEdge` 时才缩小，短边图不放大。
 * - 水印：`drawWatermark` 复用预览同款平铺算法，保证所见即所得。
 *
 * 全程在客户端完成，「低清 + 烘焙水印」预览图不占用 Worker CPU、不暴露原图。
 */
export async function compressAndWatermark(
	file: File,
	config: WatermarkConfig,
	options: CompressOptions = {},
): Promise<ProcessedImage> {
	const maxEdge = options.maxEdge ?? 1600;
	const quality = options.quality ?? 0.7;

	const bitmap = await createImageBitmap(file, {
		imageOrientation: "from-image",
	});
	try {
		const srcW = bitmap.width;
		const srcH = bitmap.height;
		const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
		const width = Math.max(1, Math.round(srcW * scale));
		const height = Math.max(1, Math.round(srcH * scale));

		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			throw new Error("无法创建 Canvas 上下文");
		}

		ctx.drawImage(bitmap, 0, 0, width, height);
		drawWatermark(ctx, config, width, height);

		const blob = await canvasToBlob(canvas, "image/jpeg", quality);
		return { blob, width, height };
	} finally {
		bitmap.close();
	}
}

/** 将处理后 Blob 包装为携带原始文件名的 JPEG File，供 multipart 上传复用原名。 */
export function toJpegFile(blob: Blob, originalName: string): File {
	const base = originalName.replace(/\.[^./\\]+$/, "");
	return new File([blob], `${base || "photo"}.jpg`, { type: "image/jpeg" });
}
