import { ORPCError } from "@orpc/server";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { photo } from "@photographer-proof-hub/db/schema/photo";
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
};
