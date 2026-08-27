import { env } from "@photographer-proof-hub/env/web";

/** 匿名访客在 localStorage 中的唯一标识键。 */
const CLIENT_KEY_STORAGE = "pph_client_key";

/** 每个分享链接的 viewToken 单独缓存，键名含 slug，便于多链接共存。 */
function tokenStorageKey(slug: string): string {
	return `pph_view_token:${slug}`;
}

/**
 * 读取（或首次生成）匿名访客标识。
 * 客户无需注册，仅用 `clientKey` 区分不同访客的标星与留言。
 */
export function getClientKey(): string {
	if (typeof window === "undefined") return "";
	try {
		const existing = window.localStorage.getItem(CLIENT_KEY_STORAGE);
		if (existing) return existing;
		const key = crypto.randomUUID();
		window.localStorage.setItem(CLIENT_KEY_STORAGE, key);
		return key;
	} catch {
		// localStorage 不可用（隐私模式等）时退化为内存态，仅当前会话有效。
		return crypto.randomUUID();
	}
}

export function loadToken(slug: string): string | null {
	if (typeof window === "undefined") return null;
	try {
		return window.localStorage.getItem(tokenStorageKey(slug));
	} catch {
		return null;
	}
}

export function saveToken(slug: string, token: string): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(tokenStorageKey(slug), token);
	} catch {
		// 忽略写入失败（如隐私模式）。
	}
}

/** 预览图读取基址（服务端 /img 路由，跨域但只读 token 鉴权）。 */
function imageBaseUrl(): string {
	const url = env.VITE_SERVER_URL ?? "http://localhost:3000";
	return url.endsWith("/") ? url.slice(0, -1) : url;
}

/**
 * 拼出带 viewToken 的预览图 URL。
 * 浏览器图片请求无法自定义 Header，故 token 走 `?token=` 查询参数。
 */
export function buildImageUrl(r2Key: string, token: string): string {
	return `${imageBaseUrl()}/img/${r2Key}?token=${encodeURIComponent(token)}`;
}
