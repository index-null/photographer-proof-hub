/**
 * 客户侧免登录访问路由（publicProcedure）。
 *
 * 访问流程：客户端先用 `guest.verify(slug, code)` 校验提取码 → 拿到 `viewToken`
 * → 后续 `guest.*` 与 `GET /img/:key` 都携带该 token 鉴权。token 由服务端 HMAC
 * 签名，绑定 slug 与过期时间，无需客户端注册或登录。
 */

import { ORPCError } from "@orpc/server";
import { galleryComment } from "@photographer-proof-hub/db/schema/comment";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { photo } from "@photographer-proof-hub/db/schema/photo";
import { photoStar } from "@photographer-proof-hub/db/schema/star";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../index";
import { verifyAccessCode } from "../lib/access-code";
import { authorizeGuest, resolveActiveShare } from "../lib/guest";
import { signViewToken } from "../lib/view-token";

const slugSchema = z.object({
	slug: z.string().min(1),
});

const tokenSchema = slugSchema.extend({
	viewToken: z.string().min(1),
});

const clientKeySchema = z.string().min(1).max(200);

/** 校验提取码并签发一次性 viewToken。 */
export const guestVerify = publicProcedure
	.input(slugSchema.extend({ code: z.string().max(200).optional() }))
	.handler(async ({ context, input }) => {
		const link = await resolveActiveShare(context.db, input.slug);

		if (link.accessCodeHash) {
			const ok = await verifyAccessCode(input.code ?? "", link.accessCodeHash);
			if (!ok) {
				throw new ORPCError("FORBIDDEN", { message: "提取码错误" });
			}
		}

		const viewToken = await signViewToken(
			context.env.VIEW_TOKEN_SECRET,
			link.slug,
		);

		return {
			viewToken,
			slug: link.slug,
			galleryId: link.galleryId,
			expiresAt: link.expiresAt,
		};
	});

/** 获取选片项目元信息（名称、描述、水印配置）。 */
export const guestGallery = publicProcedure
	.input(tokenSchema)
	.handler(async ({ context, input }) => {
		const link = await authorizeGuest(
			context.db,
			context.env.VIEW_TOKEN_SECRET,
			input.slug,
			input.viewToken,
		);

		const [row] = await context.db
			.select({
				id: gallery.id,
				name: gallery.name,
				description: gallery.description,
				watermark: gallery.watermark,
			})
			.from(gallery)
			.where(eq(gallery.id, link.galleryId));

		if (!row) {
			throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
		}
		return row;
	});

/** 列出全部预览图；若提供 clientKey，附带当前访客的标星状态。 */
export const guestPhotos = publicProcedure
	.input(tokenSchema.extend({ clientKey: clientKeySchema.optional() }))
	.handler(async ({ context, input }) => {
		const link = await authorizeGuest(
			context.db,
			context.env.VIEW_TOKEN_SECRET,
			input.slug,
			input.viewToken,
		);

		const rows = await context.db
			.select()
			.from(photo)
			.where(eq(photo.galleryId, link.galleryId))
			.orderBy(asc(photo.sortOrder), asc(photo.createdAt));

		const starredIds = new Set<string>();
		if (input.clientKey) {
			const stars = await context.db
				.select({ photoId: photoStar.photoId })
				.from(photoStar)
				.where(
					and(
						eq(photoStar.shareLinkId, link.id),
						eq(photoStar.clientKey, input.clientKey),
					),
				);
			for (const s of stars) starredIds.add(s.photoId);
		}

		return rows.map((row) => ({ ...row, starred: starredIds.has(row.id) }));
	});

/** 标星（幂等：同一 clientKey + photo 重复调用不产生多条记录）。 */
export const guestStar = publicProcedure
	.input(
		tokenSchema.extend({
			photoId: z.string().min(1),
			clientKey: clientKeySchema,
		}),
	)
	.handler(async ({ context, input }) => {
		const link = await authorizeGuest(
			context.db,
			context.env.VIEW_TOKEN_SECRET,
			input.slug,
			input.viewToken,
		);

		const [owned] = await context.db
			.select({ id: photo.id })
			.from(photo)
			.where(
				and(eq(photo.id, input.photoId), eq(photo.galleryId, link.galleryId)),
			);
		if (!owned) {
			throw new ORPCError("NOT_FOUND", { message: "图片不存在" });
		}

		await context.db
			.insert(photoStar)
			.values({
				shareLinkId: link.id,
				photoId: input.photoId,
				clientKey: input.clientKey,
			})
			.onConflictDoNothing();

		return { starred: true };
	});

/** 取消标星。 */
export const guestUnstar = publicProcedure
	.input(
		tokenSchema.extend({
			photoId: z.string().min(1),
			clientKey: clientKeySchema,
		}),
	)
	.handler(async ({ context, input }) => {
		const link = await authorizeGuest(
			context.db,
			context.env.VIEW_TOKEN_SECRET,
			input.slug,
			input.viewToken,
		);

		await context.db
			.delete(photoStar)
			.where(
				and(
					eq(photoStar.shareLinkId, link.id),
					eq(photoStar.photoId, input.photoId),
					eq(photoStar.clientKey, input.clientKey),
				),
			);

		return { starred: false };
	});

/** 提交留言（可针对整组或某张图）。 */
export const guestCommentCreate = publicProcedure
	.input(
		tokenSchema.extend({
			photoId: z.string().min(1).optional(),
			clientKey: clientKeySchema,
			name: z.string().max(100).optional(),
			content: z.string().trim().min(1).max(2000),
		}),
	)
	.handler(async ({ context, input }) => {
		const link = await authorizeGuest(
			context.db,
			context.env.VIEW_TOKEN_SECRET,
			input.slug,
			input.viewToken,
		);

		if (input.photoId) {
			const [owned] = await context.db
				.select({ id: photo.id })
				.from(photo)
				.where(
					and(eq(photo.id, input.photoId), eq(photo.galleryId, link.galleryId)),
				);
			if (!owned) {
				throw new ORPCError("NOT_FOUND", { message: "图片不存在" });
			}
		}

		const [created] = await context.db
			.insert(galleryComment)
			.values({
				shareLinkId: link.id,
				photoId: input.photoId ?? null,
				clientKey: input.clientKey,
				name: input.name ?? null,
				content: input.content,
			})
			.returning();

		if (!created) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "留言提交失败" });
		}
		return created;
	});

/** 拉取该分享链接下的全部留言（整组 + 针对单张），按时间倒序。 */
export const guestComments = publicProcedure
	.input(tokenSchema)
	.handler(async ({ context, input }) => {
		const link = await authorizeGuest(
			context.db,
			context.env.VIEW_TOKEN_SECRET,
			input.slug,
			input.viewToken,
		);

		return context.db
			.select()
			.from(galleryComment)
			.where(eq(galleryComment.shareLinkId, link.id))
			.orderBy(desc(galleryComment.createdAt));
	});

export const guestRouter = {
	verify: guestVerify,
	gallery: guestGallery,
	photos: guestPhotos,
	star: guestStar,
	unstar: guestUnstar,
	comment: {
		create: guestCommentCreate,
	},
	comments: guestComments,
};
