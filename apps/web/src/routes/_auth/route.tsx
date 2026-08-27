import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth")({
	ssr: false,
	// 鉴权区文档禁止被共享缓存，避免登录态串号。
	headers: () => ({
		"Cache-Control": "private, no-cache, no-store",
	}),
	component: AuthLayout,
	beforeLoad: async () => {
		const session = await authClient.getSession();
		if (!session.data) {
			throw redirect({
				to: "/login",
			});
		}
		return { session };
	},
});

function AuthLayout() {
	return <Outlet />;
}
