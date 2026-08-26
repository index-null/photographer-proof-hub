/**
 * 客户侧一次性访问凭证（viewToken）签名与校验。
 *
 * 客户通过 `guest.verify` 校验提取码后，服务端签发一个 HMAC-SHA256 签名的
 * viewToken，内含 `slug` 与过期时间 `exp`。后续 `guest.*` 与 `GET /img/:key`
 * 凭此 token 鉴权，无需重复校验提取码，也把访问绑定到具体分享链接。
 *
 * 密钥来自 Worker 环境变量 `VIEW_TOKEN_SECRET`，由 alchemy.run.ts 注入。
 */

import { ORPCError } from "@orpc/server";

const enc = new TextEncoder();
const dec = new TextDecoder();

/** viewToken 默认有效期：7 天（秒）。 */
export const VIEW_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

export type ViewTokenPayload = {
	slug: string;
	exp: number;
};

function base64urlFromBytes(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function bytesFromBase64url(value: string): Uint8Array {
	const b64 = value.replace(/-/g, "+").replace(/_/g, "/");
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

async function hmac(secret: string, data: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
	return base64urlFromBytes(new Uint8Array(sig));
}

/** 定长时间安全比较，避免时序侧信道。 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) {
		diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return diff === 0;
}

/**
 * 为某 slug 签发 viewToken。密钥缺失时直接抛错（部署配置问题）。
 */
export async function signViewToken(
	secret: string | undefined,
	slug: string,
	ttlSeconds: number = VIEW_TOKEN_TTL_SECONDS,
): Promise<string> {
	if (!secret) {
		throw new Error("VIEW_TOKEN_SECRET 未配置");
	}
	const payload: ViewTokenPayload = {
		slug,
		exp: Math.floor(Date.now() / 1000) + ttlSeconds,
	};
	const payloadStr = base64urlFromBytes(enc.encode(JSON.stringify(payload)));
	const signature = await hmac(secret, payloadStr);
	return `${payloadStr}.${signature}`;
}

/**
 * 校验 viewToken 签名与过期时间。失败一律抛 `UNAUTHORIZED`，调用方自行映射。
 */
export async function verifyViewToken(
	secret: string | undefined,
	token: string,
): Promise<ViewTokenPayload> {
	if (!secret) {
		throw new Error("VIEW_TOKEN_SECRET 未配置");
	}
	if (typeof token !== "string" || !token.includes(".")) {
		throw new ORPCError("UNAUTHORIZED", { message: "访问凭证格式错误" });
	}
	const sep = token.indexOf(".");
	const payloadStr = token.slice(0, sep);
	const signature = token.slice(sep + 1);
	if (!payloadStr || !signature) {
		throw new ORPCError("UNAUTHORIZED", { message: "访问凭证格式错误" });
	}

	const expected = await hmac(secret, payloadStr);
	if (!timingSafeEqual(expected, signature)) {
		throw new ORPCError("UNAUTHORIZED", { message: "访问凭证无效" });
	}

	let payload: ViewTokenPayload;
	try {
		payload = JSON.parse(
			dec.decode(bytesFromBase64url(payloadStr)),
		) as ViewTokenPayload;
	} catch {
		throw new ORPCError("UNAUTHORIZED", { message: "访问凭证解析失败" });
	}

	if (typeof payload.slug !== "string" || typeof payload.exp !== "number") {
		throw new ORPCError("UNAUTHORIZED", { message: "访问凭证字段缺失" });
	}
	if (payload.exp < Math.floor(Date.now() / 1000)) {
		throw new ORPCError("UNAUTHORIZED", { message: "访问凭证已过期" });
	}

	return payload;
}
