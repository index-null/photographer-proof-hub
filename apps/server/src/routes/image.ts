/**
 * 预览图鉴权读取（GET /img/*）。
 *
 * 客户端凭 `guest.verify` 拿到的 viewToken 通过 `?token=` 或
 * `Authorization: Bearer` 携带。服务端先校验 token 取出 slug，再复核分享链接
 * 仍有效，最后确认 `*` 路径参数（即 photo.r2Key）归属该链接对应 gallery，
 * 杜绝越权读他人图。校验通过后从 R2 读取低清水印预览图返回，并附 `Cache-Control`。
 */

import { ORPCError } from "@orpc/server";
import {
	type ActiveShare,
	resolveActiveShare,
} from "@photographer-proof-hub/api/lib/guest";
import { verifyViewToken } from "@photographer-proof-hub/api/lib/view-token";
import { createDb } from "@photographer-proof-hub/db";
import { photo } from "@photographer-proof-hub/db/schema/photo";
import { env } from "@photographer-proof-hub/env/server";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { getPreview } from "../lib/r2";

/** 浏览器侧缓存时长：1 天。预览图为只读烘焙产物，可安全长缓存。 */
const MAX_AGE_SECONDS = 60 * 60 * 24;
/** 边缘/浏览器陈旧的宽限窗口：过期后先返回旧图，后台异步回源续期。 */
const STALE_WHILE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;

export const imageRoute = new Hono();

imageRoute.get("/*", async (c) => {
	const token =
		c.req.query("token") ??
		c.req.header("Authorization")?.replace(/^Bearer\s+/i, "") ??
		"";
	if (!token) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}

	// 1) 校验 token 签名与有效期，取出其绑定的 slug
	let slug: string;
	try {
		({ slug } = await verifyViewToken(env.VIEW_TOKEN_SECRET, token));
	} catch {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}

	// 2) 复核分享链接仍有效（存在 / 启用 / 未过期）
	let link: ActiveShare;
	try {
		link = await resolveActiveShare(createDb(), slug);
	} catch (e) {
		const code = e instanceof ORPCError ? e.code : "INTERNAL_SERVER_ERROR";
		const status =
			code === "NOT_FOUND"
				? 404
				: code === "GONE"
					? 410
					: code === "FORBIDDEN"
						? 403
						: 401;
		return c.json({ error: code }, status);
	}

	// 3) 校验请求图片归属该链接的 gallery（防跨链接越权读图）
	// 注意：Hono 在带前缀的 `*` 通配下 c.req.param("*") 返回 undefined，
	// 改用 c.req.path 截取前缀拿到含斜杠的完整 key。
	const key = c.req.path.replace(/^\/img\//, "");
	if (!key) {
		return c.json({ error: "NOT_FOUND" }, 404);
	}
	const [target] = await createDb()
		.select({ id: photo.id, galleryId: photo.galleryId })
		.from(photo)
		.where(eq(photo.r2Key, key));
	if (!target || target.galleryId !== link.galleryId) {
		return c.json({ error: "FORBIDDEN" }, 403);
	}

	// 4) 读 R2 返回低清水印预览图
	const obj = await getPreview(key);
	if (!obj) {
		return c.json({ error: "NOT_FOUND" }, 404);
	}

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set(
		"Cache-Control",
		`public, max-age=${MAX_AGE_SECONDS}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_SECONDS}`,
	);
	return c.newResponse(obj.body, 200, Object.fromEntries(headers.entries()));
});
