import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// Vite 在构建时将客户端环境变量注入到 import.meta.env。
// 这里补充其类型，避免通过 any 访问。
declare global {
	interface ImportMetaEnv {
		readonly VITE_SERVER_URL?: string;
		[key: string]: string | undefined;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export const env = createEnv({
	clientPrefix: "VITE_",
	client: {
		VITE_SERVER_URL: z.url(),
	},
	runtimeEnv: import.meta.env,
	emptyStringAsUndefined: true,
});
