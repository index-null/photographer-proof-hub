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
	};
}

export type Context = Awaited<ReturnType<typeof createContext>>;
