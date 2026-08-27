import { ORPCError } from "@orpc/server";
import { galleryComment } from "@photographer-proof-hub/db/schema/comment";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { photo } from "@photographer-proof-hub/db/schema/photo";
import { shareLink } from "@photographer-proof-hub/db/schema/share_link";
import { photoStar } from "@photographer-proof-hub/db/schema/star";
import { env } from "@photographer-proof-hub/env/server";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";

export const photoRouter = {
	/** 列出某选片项目下的全部预览图（按 sortOrder、创建时间升序）。 */
	list: protectedProcedure
		.input(
			z.object({
				galleryId: z.string().min(1),
			}),
		)
		.handler(async ({ context, input }) => {
			const [owned] = await context.db
				.select({ id: gallery.id })
				.from(gallery)
				.where(
					and(
						eq(gallery.id, input.galleryId),
						eq(gallery.userId, context.session.user.id),
					),
				);

			if (!owned) {
				throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
			}

			return context.db
				.select()
				.from(photo)
				.where(eq(photo.galleryId, input.galleryId))
				.orderBy(asc(photo.sortOrder), asc(photo.createdAt));
		}),

	/**
	 * 标星清单（聚合视图）：拉取该选片项目下所有预览图的标星情况，
	 * 跨全部分享链接按访客去重计数，供摄影师导出 CSV 后回本地匹配原图。
	 */
	stars: protectedProcedure
		.input(z.object({ galleryId: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const [owned] = await context.db
				.select({ id: gallery.id })
				.from(gallery)
				.where(
					and(
						eq(gallery.id, input.galleryId),
						eq(gallery.userId, context.session.user.id),
					),
				);

			if (!owned) {
				throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
			}

			const photos = await context.db
				.select({
					id: photo.id,
					originalFilename: photo.originalFilename,
					r2Key: photo.r2Key,
					sortOrder: photo.sortOrder,
					createdAt: photo.createdAt,
				})
				.from(photo)
				.where(eq(photo.galleryId, input.galleryId))
				.orderBy(asc(photo.sortOrder), asc(photo.createdAt));

			const stars = await context.db
				.select({
					photoId: photoStar.photoId,
					clientKey: photoStar.clientKey,
				})
				.from(photoStar)
				.innerJoin(shareLink, eq(photoStar.shareLinkId, shareLink.id))
				.where(eq(shareLink.galleryId, input.galleryId));

			const byPhoto = new Map<string, Set<string>>();
			for (const star of stars) {
				let keys = byPhoto.get(star.photoId);
				if (!keys) {
					keys = new Set();
					byPhoto.set(star.photoId, keys);
				}
				keys.add(star.clientKey);
			}

			return photos
				.map((p) => {
					const keys = byPhoto.get(p.id) ?? new Set<string>();
					return {
						photoId: p.id,
						originalFilename: p.originalFilename,
						r2Key: p.r2Key,
						starCount: keys.size,
						clientKeys: [...keys],
					};
				})
				.sort(
					(a, b) =>
						b.starCount - a.starCount ||
						a.originalFilename.localeCompare(b.originalFilename),
				);
		}),

	/**
	 * 每张图的选片汇总：标星数（按访客去重）+ 针对该图的评论列表。
	 * 供摄影师在项目页直接查看「文件名 / 标星 / 评论」，快速定位需精修的图片。
	 */
	summary: protectedProcedure
		.input(z.object({ galleryId: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const [owned] = await context.db
				.select({ id: gallery.id })
				.from(gallery)
				.where(
					and(
						eq(gallery.id, input.galleryId),
						eq(gallery.userId, context.session.user.id),
					),
				);
			if (!owned) {
				throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
			}

			const photos = await context.db
				.select({
					id: photo.id,
					originalFilename: photo.originalFilename,
					r2Key: photo.r2Key,
					sortOrder: photo.sortOrder,
					createdAt: photo.createdAt,
				})
				.from(photo)
				.where(eq(photo.galleryId, input.galleryId))
				.orderBy(asc(photo.sortOrder), asc(photo.createdAt));

			const stars = await context.db
				.select({
					photoId: photoStar.photoId,
					clientKey: photoStar.clientKey,
				})
				.from(photoStar)
				.innerJoin(shareLink, eq(photoStar.shareLinkId, shareLink.id))
				.where(eq(shareLink.galleryId, input.galleryId));

			const starKeysByPhoto = new Map<string, Set<string>>();
			for (const s of stars) {
				let keys = starKeysByPhoto.get(s.photoId);
				if (!keys) {
					keys = new Set();
					starKeysByPhoto.set(s.photoId, keys);
				}
				keys.add(s.clientKey);
			}

			const rawComments = await context.db
				.select({
					id: galleryComment.id,
					photoId: galleryComment.photoId,
					name: galleryComment.name,
					content: galleryComment.content,
					clientKey: galleryComment.clientKey,
					createdAt: galleryComment.createdAt,
				})
				.from(galleryComment)
				.innerJoin(shareLink, eq(galleryComment.shareLinkId, shareLink.id))
				.where(
					and(
						eq(shareLink.galleryId, input.galleryId),
						isNotNull(galleryComment.photoId),
					),
				)
				.orderBy(asc(galleryComment.createdAt));

			const commentsByPhoto = new Map<
				string,
				{
					id: string;
					name: string | null;
					content: string;
					clientKey: string;
					createdAt: Date;
				}[]
			>();
			for (const c of rawComments) {
				if (!c.photoId) continue;
				let arr = commentsByPhoto.get(c.photoId);
				if (!arr) {
					arr = [];
					commentsByPhoto.set(c.photoId, arr);
				}
				arr.push({
					id: c.id,
					name: c.name,
					content: c.content,
					clientKey: c.clientKey,
					createdAt: c.createdAt,
				});
			}

			return photos.map((p) => ({
				photoId: p.id,
				originalFilename: p.originalFilename,
				r2Key: p.r2Key,
				sortOrder: p.sortOrder,
				starCount: starKeysByPhoto.get(p.id)?.size ?? 0,
				commentCount: commentsByPhoto.get(p.id)?.length ?? 0,
				comments: commentsByPhoto.get(p.id) ?? [],
			}));
		}),

	/**
	 * 拖拽排序落库：按前端传入的有序 id 列表，逐张覆盖 sortOrder。
	 * 仅更新归属于该项目的图片（where 同时约束 galleryId），杜绝越权改序。
	 */
	reorder: protectedProcedure
		.input(
			z.object({
				galleryId: z.string().min(1),
				orderedIds: z.array(z.string().min(1)).min(1),
			}),
		)
		.handler(async ({ context, input }) => {
			const [owned] = await context.db
				.select({ id: gallery.id })
				.from(gallery)
				.where(
					and(
						eq(gallery.id, input.galleryId),
						eq(gallery.userId, context.session.user.id),
					),
				);

			if (!owned) {
				throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
			}

			await Promise.all(
				input.orderedIds.map((id, index) =>
					context.db
						.update(photo)
						.set({ sortOrder: index })
						.where(and(eq(photo.id, id), eq(photo.galleryId, input.galleryId))),
				),
			);

			return { success: true as const };
		}),

	/** 删除单张预览图：先校验归属，再删元数据并回收 R2 对象，避免孤儿存储。 */
	delete: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.handler(async ({ context, input }) => {
			const [owned] = await context.db
				.select({ r2Key: photo.r2Key })
				.from(photo)
				.innerJoin(gallery, eq(photo.galleryId, gallery.id))
				.where(
					and(
						eq(photo.id, input.id),
						eq(gallery.userId, context.session.user.id),
					),
				);

			if (!owned) {
				throw new ORPCError("NOT_FOUND", { message: "图片不存在" });
			}

			await context.db.delete(photo).where(eq(photo.id, input.id));
			// R2 删除失败不应阻断业务（存储成本次要），吞掉错误仅记录。
			await env.PROOF_PREVIEWS.delete(owned.r2Key).catch(() => {});

			return { id: input.id };
		}),
};
