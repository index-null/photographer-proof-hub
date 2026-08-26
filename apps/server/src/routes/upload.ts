import { createAuth } from "@photographer-proof-hub/auth";
import { createDb } from "@photographer-proof-hub/db";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { photo } from "@photographer-proof-hub/db/schema/photo";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";

import { putPreview } from "../lib/r2";

/** 单文件上传大小上限（预览图在浏览器端已压缩，此上限仅用于兜底防滥用）。 */
const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

function parsePositiveInt(value: File | string | null): number | null {
	if (typeof value !== "string" || value === "") return null;
	const n = Number.parseInt(value, 10);
	if (Number.isNaN(n) || n <= 0) return null;
	return n;
}

export const uploadRoute = new Hono();

/**
 * 预览图上传（multipart → R2 → photo 元数据）。
 *
 * 请求字段：
 *   - galleryId: string（必填，须属于当前登录摄影师）
 *   - file: File（必填，浏览器端已压缩 + 平铺水印的低清 JPEG）
 *   - width / height: 可选，预览图像素尺寸（由浏览器 Canvas 提供）
 *
 * 返回：{ id, r2Key, originalFilename, width, height, size }
 */
uploadRoute.post("/", async (c) => {
	const session = await createAuth().api.getSession({
		headers: c.req.raw.headers,
	});
	if (!session?.user) {
		return c.json({ error: "UNAUTHORIZED" }, 401);
	}

	const formData = await c.req.formData();
	const galleryId = formData.get("galleryId");
	const file = formData.get("file");

	if (typeof galleryId !== "string" || galleryId.length === 0) {
		return c.json({ error: "galleryId is required" }, 400);
	}

	if (!(file instanceof File)) {
		return c.json({ error: "file is required" }, 400);
	}

	if (file.size > MAX_UPLOAD_BYTES) {
		return c.json({ error: "file too large" }, 413);
	}

	const db = createDb();

	const [owned] = await db
		.select({ id: gallery.id })
		.from(gallery)
		.where(and(eq(gallery.id, galleryId), eq(gallery.userId, session.user.id)));

	if (!owned) {
		return c.json({ error: "NOT_FOUND" }, 404);
	}

	const photoId = crypto.randomUUID();
	const r2Key = `${galleryId}/${photoId}.jpg`;
	const bytes = new Uint8Array(await file.arrayBuffer());

	await putPreview(r2Key, bytes, file.type || "image/jpeg");

	const [row] = await db
		.insert(photo)
		.values({
			id: photoId,
			galleryId,
			r2Key,
			originalFilename: file.name,
			width: parsePositiveInt(formData.get("width")),
			height: parsePositiveInt(formData.get("height")),
			size: file.size,
		})
		.returning();

	if (!row) {
		return c.json({ error: "INTERNAL_SERVER_ERROR" }, 500);
	}

	return c.json({
		id: row.id,
		r2Key: row.r2Key,
		originalFilename: row.originalFilename,
		width: row.width,
		height: row.height,
		size: row.size,
	});
});
