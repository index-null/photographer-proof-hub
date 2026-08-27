/**
 * 分享链接辅助：slug 生成。
 * 完整分享 URL（/s/:slug）由前端基于当前运行域名拼装，无需服务端基址。
 */

/** 生成 URL 安全的随机 slug（22 字符，base64url 编码 16 字节）。 */
export function generateSlug(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	const b64 = btoa(binary);
	return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
