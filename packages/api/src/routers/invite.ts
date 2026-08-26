/**
 * 邀请码验证路由。
 *
 * 强约束消费已移至 Better Auth 的 `user.create.before` 钩子（见 `packages/auth/src/index.ts`）：
 * 注册（创建 user）必须在服务端原子消费一个有效邀请码，否则整条注册中止，无法绕过前端直连注册。
 *
 * 本路由仅负责「注册前的可用性预校验」，给前端即时反馈（无效码不发起注册）。
 */

import { inviteCode } from "@photographer-proof-hub/db/schema/invite_code";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { publicProcedure } from "../index";

const codeInput = z.object({
	code: z.string().trim().min(1).max(50),
});

type InviteRow = typeof inviteCode.$inferSelect;

/** 把一条邀请码状态翻译成人类可读的拒绝原因。 */
function reasonFor(row: InviteRow | undefined): string {
	if (!row) return "邀请码不存在";
	if (!row.isActive) return "邀请码已停用";
	if (row.usedCount >= row.maxUses) return "邀请码已被使用（已达使用上限）";
	if (row.expiresAt && row.expiresAt.getTime() <= Date.now())
		return "邀请码已过期";
	return "邀请码无效";
}

/** 公开校验：仅返回是否可用及原因，不做任何消费（消费由注册钩子原子完成）。 */
export const inviteVerify = publicProcedure
	.input(codeInput)
	.handler(async ({ context, input }) => {
		const [row] = await context.db
			.select()
			.from(inviteCode)
			.where(eq(inviteCode.code, input.code));

		const valid =
			!!row &&
			row.isActive &&
			row.usedCount < row.maxUses &&
			(!row.expiresAt || row.expiresAt.getTime() > Date.now());

		return { valid, reason: valid ? undefined : reasonFor(row) };
	});

export const inviteRouter = {
	verify: inviteVerify,
};
