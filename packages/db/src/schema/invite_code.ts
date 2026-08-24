import {
	boolean,
	integer,
	pgTable,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const inviteCode = pgTable("invite_code", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	code: text("code").notNull().unique(),
	maxUses: integer("max_uses").notNull().default(1),
	usedCount: integer("used_count").notNull().default(0),
	isActive: boolean("is_active").notNull().default(true),
	note: text("note"),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	expiresAt: timestamp("expires_at"),
});
