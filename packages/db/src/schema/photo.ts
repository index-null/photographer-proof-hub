import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { gallery } from "./gallery";
import { photoStar } from "./star";

export const photo = pgTable(
	"photo",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		galleryId: text("gallery_id")
			.notNull()
			.references(() => gallery.id, { onDelete: "cascade" }),
		r2Key: text("r2_key").notNull().unique(),
		originalFilename: text("original_filename").notNull(),
		sortOrder: integer("sort_order").notNull().default(0),
		width: integer("width"),
		height: integer("height"),
		size: integer("size"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("photo_galleryId_idx").on(table.galleryId)],
);

export const photoRelations = relations(photo, ({ one, many }) => ({
	gallery: one(gallery, {
		fields: [photo.galleryId],
		references: [gallery.id],
	}),
	stars: many(photoStar),
}));
