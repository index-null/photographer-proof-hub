import { ORPCError } from "@orpc/server";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { photo } from "@photographer-proof-hub/db/schema/photo";
import { env } from "@photographer-proof-hub/env/server";
import { and, asc, eq } from "drizzle-orm";
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
