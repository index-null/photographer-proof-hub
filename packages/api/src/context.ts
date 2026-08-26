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
		// 仅透出分享链接拼装所需的客户端基址；Worker 其余绑定由各自包直接读取。
		env: context.env as { CLIENT_BASE_URL?: string },
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
