import { relations } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { photo } from "./photo";
import { shareLink } from "./share_link";

export const photoStar = pgTable(
	"photo_star",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		shareLinkId: text("share_link_id")
			.notNull()
			.references(() => shareLink.id, { onDelete: "cascade" }),
		photoId: text("photo_id")
			.notNull()
			.references(() => photo.id, { onDelete: "cascade" }),
		clientKey: text("client_key").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [
		uniqueIndex("photo_star_share_photo_client_key").on(
			table.shareLinkId,
			table.photoId,
			table.clientKey,
		),
		index("photo_star_photoId_idx").on(table.photoId),
	],
);

export const photoStarRelations = relations(photoStar, ({ one }) => ({
	photo: one(photo, {
		fields: [photoStar.photoId],
		references: [photo.id],
	}),
	shareLink: one(shareLink, {
		fields: [photoStar.shareLinkId],
		references: [shareLink.id],
	}),
}));
