import { ORPCError } from "@orpc/server";
import { gallery } from "@photographer-proof-hub/db/schema/gallery";
import { shareLink } from "@photographer-proof-hub/db/schema/share_link";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure } from "../index";
import { hashAccessCode } from "../lib/access-code";
import { generateSlug } from "../lib/share";

const linkIdSchema = z.object({ id: z.string().min(1) });

export const shareLinkRouter = {
	/** 为某选片项目创建分享链接；可选提取码（加盐 PBKDF2 哈希落库）与有效期。 */
	create: protectedProcedure
		.input(
			z.object({
				galleryId: z.string().min(1),
				accessCode: z.string().max(200).optional(),
				expiresAt: z.coerce.date().optional(),
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

			const accessCodeHash = input.accessCode
				? await hashAccessCode(input.accessCode)
				: null;

			const slug = await (async () => {
				for (let attempt = 0; attempt < 3; attempt++) {
					const candidate = generateSlug();
					const [existing] = await context.db
						.select({ id: shareLink.id })
						.from(shareLink)
						.where(eq(shareLink.slug, candidate));
					if (!existing) return candidate;
				}
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "生成分享链接失败，请重试",
				});
			})();

			const [created] = await context.db
				.insert(shareLink)
				.values({
					galleryId: input.galleryId,
					slug,
					accessCodeHash,
					expiresAt: input.expiresAt ?? null,
				})
				.returning();

			if (!created) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", {
					message: "创建分享链接失败",
				});
			}

			return {
				id: created.id,
				galleryId: created.galleryId,
				slug: created.slug,
				hasAccessCode: created.accessCodeHash !== null,
				expiresAt: created.expiresAt,
				isActive: created.isActive,
				createdAt: created.createdAt,
				updatedAt: created.updatedAt,
			};
		}),

	/** 列出某选片项目下的全部分享链接（按创建时间倒序）。 */
	list: protectedProcedure
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

			const rows = await context.db
				.select({
					id: shareLink.id,
					galleryId: shareLink.galleryId,
					slug: shareLink.slug,
					hasAccessCode: shareLink.accessCodeHash,
					expiresAt: shareLink.expiresAt,
					isActive: shareLink.isActive,
					createdAt: shareLink.createdAt,
					updatedAt: shareLink.updatedAt,
				})
				.from(shareLink)
				.where(eq(shareLink.galleryId, input.galleryId))
				.orderBy(desc(shareLink.createdAt));

			return rows.map((row) => ({
				...row,
				hasAccessCode: row.hasAccessCode !== null,
			}));
		}),

	/** 获取单条分享链接详情（须归属当前摄影师）。 */
	get: protectedProcedure
		.input(linkIdSchema)
		.handler(async ({ context, input }) => {
			const [row] = await context.db
				.select({
					id: shareLink.id,
					galleryId: shareLink.galleryId,
					slug: shareLink.slug,
					accessCodeHash: shareLink.accessCodeHash,
					expiresAt: shareLink.expiresAt,
					isActive: shareLink.isActive,
					createdAt: shareLink.createdAt,
					updatedAt: shareLink.updatedAt,
				})
				.from(shareLink)
				.innerJoin(gallery, eq(shareLink.galleryId, gallery.id))
				.where(
					and(
						eq(shareLink.id, input.id),
						eq(gallery.userId, context.session.user.id),
					),
				);

			if (!row) {
				throw new ORPCError("NOT_FOUND", { message: "分享链接不存在" });
			}

			return {
				id: row.id,
				galleryId: row.galleryId,
				slug: row.slug,
				hasAccessCode: row.accessCodeHash !== null,
				expiresAt: row.expiresAt,
				isActive: row.isActive,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
			};
		}),

	/** 关闭（禁用）某分享链接（须归属当前摄影师）。 */
	disable: protectedProcedure
		.input(linkIdSchema)
		.handler(async ({ context, input }) => {
			const [updated] = await context.db
				.update(shareLink)
				.set({ isActive: false })
				.from(gallery)
				.where(
					and(
						eq(shareLink.id, input.id),
						eq(shareLink.galleryId, gallery.id),
						eq(gallery.userId, context.session.user.id),
					),
				)
				.returning({ id: shareLink.id, isActive: shareLink.isActive });

			if (!updated) {
				throw new ORPCError("NOT_FOUND", { message: "分享链接不存在" });
			}

			return { id: updated.id, isActive: updated.isActive };
		}),
};
