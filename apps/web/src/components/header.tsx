import { Link, useRouterState } from "@tanstack/react-router";

import UserMenu from "./user-menu";

export default function Header() {
	// 客户免登录 H5（/s/*）是独立浏览页，不展示摄影师后台导航。
	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});
	if (pathname.startsWith("/s/")) {
		return null;
	}

	const links = [
		{ to: "/", label: "Home" },
		{ to: "/dashboard", label: "Dashboard" },
	] as const;

	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					{links.map(({ to, label }) => {
						return (
							<Link key={to} to={to}>
								{label}
							</Link>
						);
					})}
				</nav>
				<div className="flex items-center gap-2">
					<UserMenu />
				</div>
			</div>
			<hr />
		</div>
	);
}
