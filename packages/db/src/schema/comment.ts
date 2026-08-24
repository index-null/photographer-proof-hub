import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { photo } from "./photo";
import { shareLink } from "./share_link";

export const galleryComment = pgTable(
	"gallery_comment",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		shareLinkId: text("share_link_id")
			.notNull()
			.references(() => shareLink.id, { onDelete: "cascade" }),
		photoId: text("photo_id").references(() => photo.id, {
			onDelete: "cascade",
		}),
		clientKey: text("client_key").notNull(),
		name: text("name"),
		content: text("content").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
	},
	(table) => [index("gallery_comment_shareLinkId_idx").on(table.shareLinkId)],
);

export const galleryCommentRelations = relations(galleryComment, ({ one }) => ({
	shareLink: one(shareLink, {
		fields: [galleryComment.shareLinkId],
		references: [shareLink.id],
	}),
	photo: one(photo, {
		fields: [galleryComment.photoId],
		references: [photo.id],
	}),
}));
