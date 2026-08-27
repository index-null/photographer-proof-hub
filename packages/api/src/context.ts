import { createAuth } from "@photographer-proof-hub/auth";
import { createDb } from "@photographer-proof-hub/db";
import type { Context as HonoContext } from "hono";

export type CreateContextOptions = {
	context: HonoContext;
};

export async function createContext({ context }: CreateContextOptions) {
	const session = await createAuth().api.getSession({
		headers: context.req.raw.headers,
	});
	return {
		auth: null,
		session,
		db: createDb(),
		// 仅透出 viewToken 签名密钥；Worker 其余绑定由各自包（如 r2.ts）直接读取。
		env: context.env as {
			VIEW_TOKEN_SECRET?: string;
		},
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
