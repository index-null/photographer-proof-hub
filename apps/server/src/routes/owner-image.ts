/**
 * 摄影师本人预览图读取（GET /img/owner/*）。
 *
 * 客户侧用 `GET /img/*`（需 guest viewToken）。摄影师后台需要直接浏览自己上传的
 * 预览图，故提供一条登录态鉴权的读取通道：先校验当前登录用户，再确认目标图片
 * 所属 gallery 归该用户所有，最后从 R2 读图返回。路径参数 `*` 即 photo.r2Key
 * （形如 `${galleryId}/${photoId}.jpg`，含斜杠），与上传端对齐。
 */

import { createAuth } from "@photographer-proof-hub/auth";
import { createDb } from "@photographer-proof-hub/db";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { photo } from "@photographer-proof-hub/db/schema/photo";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { getPreview } from "../lib/r2";

/** 摄影师私有预览图缓存：1 天，private 防止被共享缓存。 */
const MAX_AGE_SECONDS = 60 * 60 * 24;

export const ownerImageRoute = new Hono();

ownerImageRoute.get("/*", async (c) => {
	const session = await createAuth().api.getSession({
		headers: c.req.raw.headers,
	});
	if (!session?.user) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}

	// 注意：Hono 在带前缀的 `*` 通配（如 /img/owner/*）下，c.req.param("*")
	// 会返回 undefined，必须用 c.req.path 截取前缀拿到含斜杠的完整 key
	// （形如 galleryId/photoId.jpg），否则会误判为缺失而 404。
	const key = c.req.path.replace(/^\/img\/owner\//, "");
	if (!key) {
		return c.json({ error: "NOT_FOUND" }, 404);
	}

	const db = createDb();
	const [owned] = await db
		.select({ userId: gallery.userId })
		.from(photo)
		.innerJoin(gallery, eq(photo.galleryId, gallery.id))
		.where(and(eq(photo.r2Key, key), eq(gallery.userId, session.user.id)));

	if (!owned) {
		return c.json({ error: "FORBIDDEN" }, 403);
	}

	const obj = await getPreview(key);
	if (!obj) {
		return c.json({ error: "NOT_FOUND" }, 404);
	}

	const headers = new Headers();
	obj.writeHttpMetadata(headers);
	headers.set("Cache-Control", `private, max-age=${MAX_AGE_SECONDS}`);
	return c.newResponse(obj.body, 200, Object.fromEntries(headers.entries()));
});
