import { Button } from "@photographer-proof-hub/ui/components/button";
import { Input } from "@photographer-proof-hub/ui/components/input";
import { Textarea } from "@photographer-proof-hub/ui/components/textarea";
import { Loader2, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { client } from "@/utils/orpc";

type GuestComment = {
	id: string;
	shareLinkId: string;
	photoId: string | null;
	clientKey: string;
	name: string | null;
	content: string;
	createdAt: Date;
};

function formatTime(d: Date): string {
	return new Intl.DateTimeFormat("zh-CN", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(d));
}

/**
 * 留言面板：拉取该分享链接下全部留言（整组 + 针对单张），
 * 支持匿名提交（昵称可选），按时间倒序展示。
 */
export function CommentPanel({
	slug,
	token,
	clientKey,
}: {
	slug: string;
	token: string;
	clientKey: string;
}) {
	const [comments, setComments] = useState<GuestComment[]>([]);
	const [loading, setLoading] = useState(true);
	const [name, setName] = useState("");
	const [content, setContent] = useState("");
	const [posting, setPosting] = useState(false);

	const load = useCallback(async () => {
		try {
			const list = (await client.guest.comments({
				slug,
				viewToken: token,
			})) as GuestComment[];
			setComments(list);
		} catch {
			toast.error("留言加载失败");
		} finally {
			setLoading(false);
		}
	}, [slug, token]);

	useEffect(() => {
		void load();
	}, [load]);

	const submit = async () => {
		const text = content.trim();
		if (!text) {
			toast.error("请输入留言内容");
			return;
		}
		setPosting(true);
		try {
			await client.guest.comment.create({
				slug,
				viewToken: token,
				clientKey,
				name: name.trim() || undefined,
				content: text,
			});
			setContent("");
			toast.success("留言已提交");
			await load();
		} catch {
			toast.error("留言提交失败");
		} finally {
			setPosting(false);
		}
	};

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
			<div className="space-y-2 rounded-none border bg-card p-3">
				<Input
					value={name}
					placeholder="昵称（可选）"
					maxLength={100}
					onChange={(e) => setName(e.target.value)}
				/>
				<Textarea
					value={content}
					placeholder="写下你的想法…"
					maxLength={2000}
					onChange={(e) => setContent(e.target.value)}
				/>
				<div className="flex justify-end">
					<Button size="sm" disabled={posting} onClick={() => void submit()}>
						发表留言
					</Button>
				</div>
			</div>

			{loading ? (
				<div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
					<Loader2 className="size-5 animate-spin" />
					<span className="text-sm">加载留言…</span>
				</div>
			) : comments.length === 0 ? (
				<div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
					<MessageSquare className="size-6" />
					<p className="text-sm">还没有留言，来抢沙发吧</p>
				</div>
			) : (
				<ul className="space-y-3">
					{comments.map((c) => (
						<li key={c.id} className="rounded-none border bg-card p-3">
							<div className="flex items-center justify-between gap-2">
								<span className="font-medium text-sm">
									{c.name?.trim() || "匿名访客"}
								</span>
								<span className="text-muted-foreground text-xs">
									{formatTime(c.createdAt)}
								</span>
							</div>
							<p className="mt-1 whitespace-pre-wrap text-sm">{c.content}</p>
							{c.photoId ? (
								<span className="mt-1 inline-block rounded-none bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
									针对单张照片
								</span>
							) : null}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
