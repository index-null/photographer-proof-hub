import { env } from "@photographer-proof-hub/env/web";

export type PreviewUploadResult = {
	id: string;
	r2Key: string;
	originalFilename: string;
	width: number | null;
	height: number | null;
	size: number;
};

function serverBaseUrl(): string {
	const url = env.VITE_SERVER_URL ?? "http://localhost:3000";
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * 上传已压缩 + 平铺水印的预览图到 `POST /api/upload`（multipart）。
 *
 * 用 XHR 而非 fetch：只有 XHR 能拿到上传进度（`upload.onprogress`），
 * fetch 暂不支持请求体上传进度。携带 Cookie 凭证以供服务端校验登录态。
 */
export function uploadPreview(opts: {
	galleryId: string;
	file: File;
	width: number;
	height: number;
	onProgress?: (fraction: number) => void;
	signal?: AbortSignal;
}): Promise<PreviewUploadResult> {
	return new Promise((resolve, reject) => {
		const formData = new FormData();
		formData.append("galleryId", opts.galleryId);
		formData.append("file", opts.file);
		formData.append("width", String(opts.width));
		formData.append("height", String(opts.height));

		const xhr = new XMLHttpRequest();
		xhr.open("POST", `${serverBaseUrl()}/api/upload`);
		xhr.withCredentials = true;

		xhr.upload.onprogress = (event) => {
			if (event.lengthComputable && opts.onProgress) {
				opts.onProgress(event.loaded / event.total);
			}
		};

		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					resolve(JSON.parse(xhr.responseText) as PreviewUploadResult);
				} catch {
					reject(new Error("服务器响应解析失败"));
				}
				return;
			}
			let message = `上传失败（${xhr.status}）`;
			try {
				const body = JSON.parse(xhr.responseText) as { error?: string };
				if (body?.error) message = body.error;
			} catch {
				// 忽略非 JSON 响应体
			}
			reject(new Error(message));
		};

		xhr.onerror = () => reject(new Error("网络错误，上传失败"));
		xhr.onabort = () => reject(new DOMException("上传已取消", "AbortError"));

		if (opts.signal) {
			opts.signal.addEventListener("abort", () => xhr.abort(), { once: true });
		}

		xhr.send(formData);
	});
}
