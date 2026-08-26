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
