import { env } from "@photographer-proof-hub/env/server";

/**
 * 将预览图写入 R2 桶。预览图在浏览器端已完成「低清压缩 + 平铺水印」，
 * 这里只做纯搬运，Worker 不承担任何图片处理 CPU 成本。
 */
export function putPreview(
	key: string,
	value: ArrayBuffer | Uint8Array,
	contentType: string,
) {
	return env.PROOF_PREVIEWS.put(key, value, {
		httpMetadata: { contentType },
	});
}

/**
 * 从 R2 桶读取预览图。返回 R2ObjectBody 或 null（对象不存在）。
 * 调用方负责校验访问权限（viewToken）后再调用本函数。
 */
export function getPreview(key: string) {
	return env.PROOF_PREVIEWS.get(key);
}
