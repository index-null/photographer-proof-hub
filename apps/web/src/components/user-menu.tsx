import { Button } from "@photographer-proof-hub/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@photographer-proof-hub/ui/components/dropdown-menu";
import { Skeleton } from "@photographer-proof-hub/ui/components/skeleton";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LayoutGrid, LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
	const navigate = useNavigate();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <Skeleton className="h-9 w-28 rounded-xl" />;
	}

	if (!session) {
		return (
			<Link to="/login">
				<Button variant="outline" className="rounded-xl font-light">
					登录
				</Button>
			</Link>
		);
	}

	const name = session.user.name?.trim() || session.user.email;
	const initial = name.slice(0, 1).toUpperCase();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<button type="button" />}
				className="group flex h-9 shrink-0 items-center gap-2 rounded-xl bg-muted/60 pr-2.5 pl-1 outline-none ring-1 ring-transparent transition-colors duration-200 ease-emphasized hover:bg-muted focus-visible:ring-ring/50 aria-expanded:bg-muted"
			>
				<span className="flex size-7 items-center justify-center rounded-full bg-card font-light text-xs ring-1 ring-border">
					{initial}
				</span>
				<span className="max-w-28 truncate font-light text-sm">{name}</span>
				<ChevronDown className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-emphasized group-aria-expanded:rotate-180" />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" sideOffset={8} className="w-60">
				<div className="flex items-center gap-3 px-2.5 py-2">
					<span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted font-light text-sm">
						{initial}
					</span>
					<span className="flex min-w-0 flex-col leading-tight">
						<span className="truncate text-sm">{session.user.name}</span>
						<span className="truncate text-muted-foreground text-xs">
							{session.user.email}
						</span>
					</span>
				</div>

				<DropdownMenuSeparator />

				<DropdownMenuGroup>
					<DropdownMenuItem
						onClick={() => {
							navigate({ to: "/dashboard" });
						}}
					>
						<LayoutGrid />
						我的工作台
					</DropdownMenuItem>
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate({
											to: "/",
										});
									},
								},
							});
						}}
					>
						<LogOut />
						退出登录
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
