import type { ReactNode } from "react";

import { siteConfig } from "@/modules/home/data";

/**
 * 登录 / 注册共用的卡片外壳：延续首页的「圆角卡片 + 细描边 + 克制留白」语言。
 * 品牌行、标题区、表单区、底部切换区四段式结构，不含任何发光或渐变装饰。
 */
export function AuthCard({
	title,
	description,
	children,
	footer,
}: {
	title: string;
	description: string;
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<div className="flex min-h-full items-center justify-center p-3">
			<div className="w-full max-w-md">
				<div className="flex flex-col gap-8 rounded-2xl bg-card p-7 ring-1 ring-border sm:p-9">
					<div className="flex flex-col gap-6">
						<div className="flex items-center gap-3">
							<img
								src={siteConfig.avatar}
								alt=""
								className="size-11 shrink-0 rounded-full object-cover ring-1 ring-border"
							/>
							<span className="flex min-w-0 flex-col leading-tight">
								<span className="truncate font-light text-sm">
									{siteConfig.name}
								</span>
								<span className="truncate text-muted-foreground text-xs">
									{siteConfig.tagline}
								</span>
							</span>
						</div>

						<div className="flex flex-col gap-2">
							<h1 className="font-light text-2xl tracking-tight">{title}</h1>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{description}
							</p>
						</div>
					</div>

					{children}
				</div>

				{footer ? (
					<div className="mt-3 rounded-2xl bg-muted/50 px-6 py-4 text-center">
						{footer}
					</div>
				) : null}
			</div>
		</div>
	);
}
