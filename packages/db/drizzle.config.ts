import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
	path: "../../apps/server/.env",
});

export default defineConfig({
	schema: "./src/schema",
	out: "./src/migrations",
	dialect: "postgresql",
	dbCredentials: {
		// 迁移走 DIRECT_URL（Session pooler, 5432），运行时才用事务池
		url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
	},
});
