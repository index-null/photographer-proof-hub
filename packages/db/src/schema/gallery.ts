import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { user } from "./auth";
import { photo } from "./photo";
import { shareLink } from "./share_link";

export type WatermarkConfig = {
	text: string;
	color: string;
	opacity: number;
	fontSize: number;
	rotation: number;
	gapX: number;
	gapY: number;
	enabled: boolean;
};

export const gallery = pgTable(
	"gallery",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		description: text("description"),
		watermark: jsonb("watermark").$type<WatermarkConfig>(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [index("gallery_userId_idx").on(table.userId)],
);

export const galleryRelations = relations(gallery, ({ many }) => ({
	photos: many(photo),
	shareLinks: many(shareLink),
}));
