import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { createContext } from "@photographer-proof-hub/api/context";
import { appRouter } from "@photographer-proof-hub/api/routers/index";
import { createAuth } from "@photographer-proof-hub/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { uploadRoute } from "./routes/upload";

const app = new Hono();

app.use(logger());
// 本地开发(localhost)与 Cloudflare Workers 免费子域(*.workers.dev)动态放行，
// 字符串通配符在 CORS 规范中无效，必须按请求 origin 精确反射。
function resolveCorsOrigin(origin: string): string | null {
	if (!origin) return null;
	try {
		const { hostname } = new URL(origin);
		if (
			hostname === "localhost" ||
			hostname.endsWith(".workers.dev") ||
			hostname === "chuhsing.com" ||
			hostname.endsWith(".chuhsing.com")
		) {
			return origin;
		}
	} catch {
		// 非法 origin 一律拒绝
	}
	return null;
}

app.use(
	"/*",
	cors({
		origin: resolveCorsOrigin,
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => createAuth().handler(c.req.raw));

app.route("/api/upload", uploadRoute);

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			console.error(error);
		}),
	],
});

app.use("/*", async (c, next) => {
	const context = await createContext({ context: c });

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: "/rpc",
		context: context,
	});

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response);
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: "/api-reference",
		context: context,
	});

	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response);
	}

	await next();
});

app.get("/", (c) => {
	return c.text("OK");
});

export default app;
