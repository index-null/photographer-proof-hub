import { Button } from "@photographer-proof-hub/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@photographer-proof-hub/ui/components/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@photographer-proof-hub/ui/components/dropdown-menu";
import {
	Empty,
	EmptyDescription,
	EmptyMedia,
	EmptyTitle,
} from "@photographer-proof-hub/ui/components/empty";
import { Skeleton } from "@photographer-proof-hub/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	ImageIcon,
	MoreVertical,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CreateGalleryDialog from "@/components/create-gallery-dialog";
import { client, orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
	component: RouteComponent,
});

const dateFmt = new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium" });

function RouteComponent() {
	const queryClient = useQueryClient();
	const [createOpen, setCreateOpen] = useState(false);

	const galleriesQuery = useQuery(orpc.gallery.list.queryOptions());

	const deleteMutation = useMutation({
		mutationFn: (id: string) => client.gallery.delete({ id }),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.list.queryOptions().queryKey,
			});
			toast.success("项目已删除");
		},
		onError: (error) => toast.error(error.message || "删除失败"),
	});

	const galleries = galleriesQuery.data ?? [];

	return (
		<div className="mx-auto w-full max-w-5xl p-6">
			<div className="mb-6 flex items-start justify-between gap-4">
				<div>
					<h1 className="cn-font-heading font-bold text-2xl">选片项目</h1>
					<p className="mt-1 text-muted-foreground text-sm">
						管理你的选片 gallery，配置水印并分享给客户。
					</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<Plus />
					新建项目
				</Button>
			</div>

			{galleriesQuery.isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-44 w-full" />
					))}
				</div>
			) : galleries.length === 0 ? (
				<Card>
					<CardContent>
						<Empty>
							<EmptyMedia variant="icon">
								<ImageIcon />
							</EmptyMedia>
							<EmptyTitle>还没有选片项目</EmptyTitle>
							<EmptyDescription>
								创建第一个项目，配置专属水印并邀请客户在线选片。
							</EmptyDescription>
							<Button onClick={() => setCreateOpen(true)}>
								<Plus />
								新建项目
							</Button>
						</Empty>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{galleries.map((g) => (
						<Card key={g.id}>
							<CardHeader>
								<CardTitle className="pr-8">
									<Link
										to="/gallery/$galleryId"
										params={{ galleryId: g.id }}
										className="hover:underline"
									>
										{g.name}
									</Link>
								</CardTitle>
								{g.description ? (
									<CardDescription className="line-clamp-2">
										{g.description}
									</CardDescription>
								) : null}
								<CardAction>
									<DropdownMenu>
										<DropdownMenuTrigger
											render={
												<Button
													variant="ghost"
													size="icon"
													aria-label="更多操作"
												/>
											}
										>
											<MoreVertical />
										</DropdownMenuTrigger>
										<DropdownMenuContent className="bg-popover">
											<DropdownMenuItem
												variant="destructive"
												onClick={() => {
													if (
														window.confirm(
															`确定删除项目「${g.name}」吗？此操作不可撤销。`,
														)
													) {
														deleteMutation.mutate(g.id);
													}
												}}
											>
												<Trash2 />
												删除
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</CardAction>
							</CardHeader>
							<CardContent className="space-y-3">
								<div className="flex items-center justify-between text-muted-foreground text-xs">
									<span>创建于 {dateFmt.format(new Date(g.createdAt))}</span>
								</div>
								{g.watermark?.enabled ? (
									<span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary text-xs">
										水印已启用
									</span>
								) : (
									<span className="inline-block rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
										无水印
									</span>
								)}
								<Link
									to="/gallery/$galleryId"
									params={{ galleryId: g.id }}
									className="mt-3 inline-flex items-center gap-1 text-primary text-sm hover:underline"
								>
									上传 / 管理
									<ArrowRight className="size-4" />
								</Link>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			<CreateGalleryDialog open={createOpen} onOpenChange={setCreateOpen} />
		</div>
	);
}
