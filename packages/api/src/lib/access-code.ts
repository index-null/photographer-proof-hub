/**
 * 提取码哈希工具。
 *
 * 提取码只以「盐 + PBKDF2 派生哈希」形式落库，明文不持久化、不返回前端。
 * 同套逻辑将被「客户侧校验（Iter 2.3 guest.verify）」复用，因此独立为一个模块。
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DIGEST_BITS = 256;

function toBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const b of bytes) binary += String.fromCharCode(b);
	return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
	const binary = atob(value);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/**
 * 对提取码做加盐哈希，返回可持久化的字符串：`base64(salt):base64(hash)`。
 */
export async function hashAccessCode(code: string): Promise<string> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(code),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
		keyMaterial,
		DIGEST_BITS,
	);
	return `${toBase64(salt)}:${toBase64(new Uint8Array(bits))}`;
}

/**
 * 校验明文提取码是否匹配已存储的哈希。时序恒定（仅比对派生结果），
 * 对任意非法格式返回 false，不抛错。
 */
export async function verifyAccessCode(
	code: string,
	stored: string | null | undefined,
): Promise<boolean> {
	if (!stored) return false;
	const sep = stored.indexOf(":");
	if (sep < 0) return false;
	const salt = fromBase64(stored.slice(0, sep));
	const expected = fromBase64(stored.slice(sep + 1));

	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(code),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const bits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt,
			iterations: PBKDF2_ITERATIONS,
			hash: "SHA-256",
		},
		keyMaterial,
		DIGEST_BITS,
	);
	const derived = new Uint8Array(bits);
	if (derived.length !== expected.length) return false;

	let diff = 0;
	for (let i = 0; i < derived.length; i++) {
		diff |= (derived[i] ?? 0) ^ (expected[i] ?? 0);
	}
	return diff === 0;
}
