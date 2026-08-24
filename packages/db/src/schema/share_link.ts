import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { galleryComment } from "./comment";
import { gallery } from "./gallery";
import { photoStar } from "./star";

export const shareLink = pgTable(
	"share_link",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		galleryId: text("gallery_id")
			.notNull()
			.references(() => gallery.id, { onDelete: "cascade" }),
		slug: text("slug").notNull().unique(),
		accessCodeHash: text("access_code_hash"),
		expiresAt: timestamp("expires_at"),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("share_link_galleryId_idx").on(table.galleryId)],
);

export const shareLinkRelations = relations(shareLink, ({ one, many }) => ({
	gallery: one(gallery, {
		fields: [shareLink.galleryId],
		references: [gallery.id],
	}),
	stars: many(photoStar),
	comments: many(galleryComment),
}));
