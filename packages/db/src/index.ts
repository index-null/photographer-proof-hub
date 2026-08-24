import { env } from "@photographer-proof-hub/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export function createDb() {
	// Supabase Transaction pooler (端口 6543) 不支持 prepared statements，必须关闭
	const client = postgres(env.DATABASE_URL || "", {
		max: 1,
		prepare: false,
	});

	return drizzle({ client, schema });
}
