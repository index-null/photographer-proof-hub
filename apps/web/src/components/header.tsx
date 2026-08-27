import { Link, useRouterState } from "@tanstack/react-router";

import { siteConfig } from "@/modules/home/data";

import UserMenu from "./user-menu";

const links = [
	{ to: "/", label: "首页", exact: true },
	{ to: "/dashboard", label: "工作台", exact: false },
] as const;

/**
 * 顶部导航：与首页一致的「浮动卡片」语言 —— 圆角容器 + 半透明背景 + 细描边，
 * 导航项用分段控件（segmented control）表达当前位置，不使用任何光效。
 * 高度固定 64px（pt-3 + p-2 + 36px 内容），首页左侧画廊的高度计算与此对齐。
 */
export default function Header() {
	// 客户免登录 H5（/s/*）是独立浏览页，不展示摄影师后台导航。
	const pathname = useRouterState({
		select: (s) => s.location.pathname,
	});
	if (pathname.startsWith("/s/")) {
		return null;
	}

	return (
		<header className="px-3 pt-3">
			<div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3 rounded-2xl bg-card/70 p-2 ring-1 ring-border backdrop-blur-xl">
				<Link
					to="/"
					className="flex items-center gap-3 rounded-xl pr-2 pl-0.5 transition-opacity duration-200 ease-emphasized hover:opacity-70"
				>
					<img
						src={siteConfig.avatar}
						alt=""
						className="size-9 shrink-0 rounded-full object-cover ring-1 ring-border"
					/>
					<span className="flex min-w-0 flex-col leading-tight">
						<span className="truncate font-light text-sm">
							{siteConfig.websiteTitle}
						</span>
						<span className="truncate text-muted-foreground text-xs">
							{siteConfig.tagline}
						</span>
					</span>
				</Link>

				<nav className="flex items-center gap-2">
					<div className="flex items-center gap-0.5 rounded-xl bg-muted/60 p-1">
						{links.map(({ to, label, exact }) => (
							<Link
								key={to}
								to={to}
								activeOptions={{ exact }}
								className="rounded-lg px-3 py-1.5 font-light text-muted-foreground text-sm transition-colors duration-200 ease-emphasized hover:text-foreground data-[status=active]:bg-card data-[status=active]:text-foreground data-[status=active]:ring-1 data-[status=active]:ring-border"
							>
								{label}
							</Link>
						))}
					</div>
					<UserMenu />
				</nav>
			</div>
		</header>
	);
}
