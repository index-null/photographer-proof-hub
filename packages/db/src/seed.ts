import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { inviteCode } from "./schema/invite_code";

// seed 运行在 Bun/Node 环境（非 Cloudflare Workers），
// 因此不能用 @photographer-proof-hub/env/server（它走 cloudflare:workers），
// 改为直接读取 .env，与 drizzle.config.ts 保持一致的路径。
dotenv.config({ path: "../../apps/server/.env" });

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";

const PILOT_CODES = [
	{ code: "PILOT-001", note: "首批试点摄影师 1" },
	{ code: "PILOT-002", note: "首批试点摄影师 2" },
	{ code: "PILOT-003", note: "首批试点摄影师 3" },
	{ code: "PILOT-004", note: "首批试点摄影师 4" },
	{ code: "PILOT-005", note: "首批试点摄影师 5" },
];

async function main() {
	if (!url) {
		throw new Error("DATABASE_URL / DIRECT_URL 未配置，无法执行 seed");
	}

	const client = postgres(url, { max: 1, prepare: false });
	const db = drizzle({ client });

	let created = 0;
	for (const item of PILOT_CODES) {
		const existing = await db
			.select()
			.from(inviteCode)
			.where(eq(inviteCode.code, item.code));

		if (existing.length > 0) {
			console.log(`[skip] 已存在: ${item.code}`);
			continue;
		}

		await db.insert(inviteCode).values({
			code: item.code,
			maxUses: 1,
			usedCount: 0,
			isActive: true,
			note: item.note,
		});
		console.log(`[created] ${item.code}`);
		created++;
	}

	console.log(
		`\n完成：新建 ${created} 个邀请码，当前共 ${PILOT_CODES.length} 个试点码`,
	);
	await client.end();
}

main().catch((error) => {
	console.error("seed 失败:", error);
	process.exit(1);
});
