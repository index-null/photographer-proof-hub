import { createDb } from "@photographer-proof-hub/db";
import * as schema from "@photographer-proof-hub/db/schema/auth";
import { inviteCode } from "@photographer-proof-hub/db/schema/invite_code";
import { env } from "@photographer-proof-hub/env/server";
import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { and, eq, gt, isNull, lt, or, sql } from "drizzle-orm";

/** 把一条邀请码状态翻译成人类可读的拒绝原因（与 api/routers/invite.ts 保持一致）。 */
function inviteRejectReason(
	row: typeof inviteCode.$inferSelect | undefined,
): string {
	if (!row) return "邀请码不存在";
	if (!row.isActive) return "邀请码已停用";
	if (row.usedCount >= row.maxUses) return "邀请码已被使用（已达使用上限）";
	if (row.expiresAt && row.expiresAt.getTime() <= Date.now())
		return "邀请码已过期";
	return "邀请码无效";
}

export function createAuth() {
	const db = createDb();

	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",

			schema: schema,
		}),
		// 强约束：注册（创建 user）必须在服务端原子消费一个有效邀请码，否则整条注册中止。
		// 钩子在 sign-up 事务内、user 行插入前执行；抛错 → 用户永不被创建 → 无法绕过前端直连注册。
		databaseHooks: {
			user: {
				create: {
					before: async (user, context) => {
						const code = (context?.body as { inviteCode?: string } | undefined)
							?.inviteCode;
						if (typeof code !== "string" || !code.trim()) {
							throw new APIError("BAD_REQUEST", { message: "邀请码必填" });
						}

						// 原子预约：单条 UPDATE 带 WHERE 条件，数据库对命中行加锁，并发不会超发
						const [reserved] = await db
							.update(inviteCode)
							.set({ usedCount: sql`${inviteCode.usedCount} + 1` })
							.where(
								and(
									eq(inviteCode.code, code.trim()),
									eq(inviteCode.isActive, true),
									lt(inviteCode.usedCount, inviteCode.maxUses),
									or(
										isNull(inviteCode.expiresAt),
										gt(inviteCode.expiresAt, new Date()),
									),
								),
							)
							.returning({ id: inviteCode.id });

						if (!reserved) {
							const [row] = await db
								.select()
								.from(inviteCode)
								.where(eq(inviteCode.code, code.trim()));
							throw new APIError("FORBIDDEN", {
								message: inviteRejectReason(row),
							});
						}

						// 把消费到的邀请码 id 注入 user 行，随本次注册一并写入
						return { data: { ...user, inviteCodeId: reserved.id } };
					},
				},
			},
		},
		trustedOrigins: [env.CORS_ORIGIN, "https://*.chuhsing.com"],
		emailAndPassword: {
			enabled: true,
		},
		// 让 Better Auth 把 inviteCodeId 当作用户一等字段：注册钩子注入的值才会被真正落库
		user: {
			additionalFields: {
				inviteCodeId: {
					type: "string",
					required: false,
					nullable: true,
				},
			},
		},
		// uncomment cookieCache setting when ready to deploy to Cloudflare using *.workers.dev domains
		// session: {
		//   cookieCache: {
		//     enabled: true,
		//     maxAge: 60,
		//   },
		// },
		secret: env.BETTER_AUTH_SECRET,
		baseURL: env.BETTER_AUTH_URL,
		advanced: {
			defaultCookieAttributes: {
				sameSite: "none",
				secure: true,
				httpOnly: true,
			},
			// uncomment crossSubDomainCookies setting when ready to deploy and replace <your-workers-subdomain> with your actual workers subdomain
			// https://developers.cloudflare.com/workers/wrangler/configuration/#workersdev
			// crossSubDomainCookies: {
			//   enabled: true,
			//   domain: "<your-workers-subdomain>",
			// },
		},
	});
}
