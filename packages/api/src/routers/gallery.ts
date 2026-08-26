import { ORPCError } from "@orpc/server";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure } from "../index";

/** 平铺水印配置校验。字段与 `WatermarkConfig` 类型保持一致。 */
const watermarkSchema = z.object({
	text: z.string().max(200).default(""),
	color: z.string().max(30).default("#ffffff"),
	opacity: z.number().min(0).max(1).default(0.3),
	fontSize: z.number().min(1).max(500).default(24),
	rotation: z.number().min(-180).max(180).default(-30),
	gapX: z.number().min(0).max(2000).default(120),
	gapY: z.number().min(0).max(2000).default(120),
	enabled: z.boolean().default(true),
});

const galleryIdSchema = z.object({
	id: z.string().min(1),
});

export const galleryRouter = {
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().trim().min(1).max(200),
				description: z.string().trim().max(2000).optional(),
				watermark: watermarkSchema.optional(),
			}),
		)
		.handler(async ({ context, input }) => {
			const [created] = await context.db
				.insert(gallery)
				.values({
					userId: context.session.user.id,
					name: input.name,
					description: input.description ?? null,
					watermark: input.watermark ?? null,
				})
				.returning();

			if (!created) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "创建项目失败",
				});
			}

			return created;
		}),

	list: protectedProcedure.handler(async ({ context }) => {
		return context.db
			.select()
			.from(gallery)
			.where(eq(gallery.userId, context.session.user.id))
			.orderBy(desc(gallery.createdAt));
	}),

	get: protectedProcedure
		.input(galleryIdSchema)
		.handler(async ({ context, input }) => {
			const [row] = await context.db
				.select()
				.from(gallery)
				.where(
					and(
						eq(gallery.id, input.id),
						eq(gallery.userId, context.session.user.id),
					),
				);

			if (!row) {
				throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
			}

			return row;
		}),

	update: protectedProcedure
		.input(
			z.object({
				id: z.string().min(1),
				name: z.string().trim().min(1).max(200).optional(),
				description: z.string().trim().max(2000).nullish(),
				watermark: watermarkSchema.nullish(),
			}),
		)
		.handler(async ({ context, input }) => {
			const [existing] = await context.db
				.select()
				.from(gallery)
				.where(
					and(
						eq(gallery.id, input.id),
						eq(gallery.userId, context.session.user.id),
					),
				);

			if (!existing) {
				throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
			}

			const [updated] = await context.db
				.update(gallery)
				.set({
					name: input.name ?? existing.name,
					description:
						input.description === undefined
							? existing.description
							: input.description,
					watermark:
						input.watermark === undefined
							? existing.watermark
							: input.watermark,
				})
				.where(eq(gallery.id, input.id))
				.returning();

			if (!updated) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "更新项目失败",
				});
			}

			return updated;
		}),

	delete: protectedProcedure
		.input(galleryIdSchema)
		.handler(async ({ context, input }) => {
			const [deleted] = await context.db
				.delete(gallery)
				.where(
					and(
						eq(gallery.id, input.id),
						eq(gallery.userId, context.session.user.id),
					),
				)
				.returning({ id: gallery.id });

			if (!deleted) {
				throw new ORPCError("NOT_FOUND", { message: "项目不存在" });
			}

			return { id: deleted.id };
		}),
};
