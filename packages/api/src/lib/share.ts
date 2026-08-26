/**
 * 分享链接辅助：slug 生成与完整分享 URL 拼装。
 */

/** 生成 URL 安全的随机 slug（22 字符，base64url 编码 16 字节）。 */
export function generateSlug(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	const b64 = btoa(binary);
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * 由 slug 拼出客户 H5 的完整访问地址（`${CLIENT_BASE_URL}/s/${slug}`）。
 * `base` 来自 Worker 环境变量 `CLIENT_BASE_URL`，未配置时回退到空串（仅 slug 可用）。
 */
export function buildShareUrl(base: string | undefined, slug: string): string {
	const trimmed = (base ?? "").replace(/\/+$/, "");
	if (!trimmed) return `/s/${slug}`;
	return `${trimmed}/s/${slug}`;
}
