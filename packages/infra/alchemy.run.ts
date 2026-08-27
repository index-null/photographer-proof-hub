import * as Alchemy from "alchemy";
import * as Cloudflare from "alchemy/Cloudflare";
import { config } from "dotenv";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

config({ path: "./.env" });
config({ path: "../../apps/web/.env" });
config({ path: "../../apps/server/.env" });

export const ProofPreviews = Cloudflare.R2.Bucket("ProofPreviews");

export const server = Cloudflare.Worker("server", {
	main: "../../apps/server/src/index.ts",
	domain: "api.chuhsing.com",
	compatibility: {
		flags: ["nodejs_compat"],
	},
	// 开启 Workers Cache：只读资源（客片图 / guest 数据）按 Cache-Control 在边缘缓存，
	// 命中即不回源（不跑 Worker、不查库/读 R2）。crossVersionCache 让缓存跨发版保留。
	cache: { enabled: true, crossVersionCache: true },
	env: {
		DATABASE_URL: Config.redacted("DATABASE_URL"),
		CORS_ORIGIN: Config.string("CORS_ORIGIN"),
		CLIENT_BASE_URL: Config.string("CLIENT_BASE_URL"),
		BETTER_AUTH_SECRET: Config.redacted("BETTER_AUTH_SECRET"),
		VIEW_TOKEN_SECRET: Config.redacted("VIEW_TOKEN_SECRET"),
		BETTER_AUTH_URL: Cloudflare.Worker.URL,
		PROOF_PREVIEWS: ProofPreviews,
	},
	dev: {
		port: 3000,
	},
});

export type ServerEnv = Cloudflare.InferEnv<typeof server>;

export default Alchemy.Stack(
	"photographer-proof-hub",
	{
		providers: Cloudflare.providers(),
		state: Alchemy.localState(),
	},
	Effect.gen(function* () {
		const serverWorker = yield* server;
		const webWorker = yield* Cloudflare.Website.Vite("web", {
			rootDir: "../../apps/web",
			domain: "photo.chuhsing.com",
			compatibility: {
				flags: ["nodejs_compat"],
			},
			env: {
				VITE_SERVER_URL: serverWorker.url.as<string>(),
			},
			dev: {
				port: 3001,
			},
		});

		return {
			web: webWorker.url,
			server: serverWorker.url,
		};
	}),
);
