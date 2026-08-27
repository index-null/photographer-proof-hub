import { Button } from "@photographer-proof-hub/ui/components/button";
import { Input } from "@photographer-proof-hub/ui/components/input";
import { Label } from "@photographer-proof-hub/ui/components/label";
import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { Loader2, Lock } from "lucide-react";
import { useState } from "react";

import type { GuestPhase } from "./use-guest";

function StatusScreen({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center gap-3 p-6 text-center">
			<div className="flex size-12 items-center justify-center rounded-full bg-muted">
				<Lock className="size-5 text-muted-foreground" />
			</div>
			<h1 className="cn-font-heading font-semibold text-lg">{title}</h1>
			<p className="text-muted-foreground text-sm">{description}</p>
		</div>
	);
}

/**
 * 访问门：根据会话状态渲染提取码输入或各失败状态页。
 * `phase` 由 `useGuest` 驱动；`onSubmit` 触发校验（空串=无码直进）。
 */
export function AccessGate({
	phase,
	error,
	onSubmit,
}: {
	phase: GuestPhase;
	error: string | null;
	onSubmit: (code: string) => Promise<void>;
}) {
	const [code, setCode] = useState("");
	const [submitting, setSubmitting] = useState(false);

	if (phase === "init") {
		return (
			<div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center gap-3 p-6 text-muted-foreground">
				<Loader2 className="size-6 animate-spin" />
				<span className="text-sm">加载中…</span>
			</div>
		);
	}
	if (phase === "notFound") {
		return (
			<StatusScreen
				title="链接不存在"
				description="该分享链接可能已被删除或从未生成。"
			/>
		);
	}
	if (phase === "expired") {
		return (
			<StatusScreen
				title="链接已过期"
				description="此分享链接已超过有效期，请联系摄影师重新生成。"
			/>
		);
	}
	if (phase === "disabled") {
		return (
			<StatusScreen
				title="链接已失效"
				description="摄影师已关闭此分享链接，暂不可访问。"
			/>
		);
	}

	// needCode / wrongCode
	const submit = async () => {
		setSubmitting(true);
		try {
			await onSubmit(code.trim());
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="mx-auto flex min-h-full max-w-sm flex-col justify-center gap-6 p-6">
			<div className="text-center">
				<h1 className="cn-font-heading font-semibold text-xl">私密选片</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					该分享链接受提取码保护
				</p>
			</div>
			<div className="space-y-2">
				<Label htmlFor="access-code">提取码</Label>
				<Input
					id="access-code"
					value={code}
					autoFocus
					placeholder="请输入提取码"
					onChange={(e) => setCode(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !submitting) void submit();
					}}
				/>
				{phase === "wrongCode" && error ? (
					<p className={cn("text-destructive text-xs")}>{error}</p>
				) : null}
			</div>
			<Button disabled={submitting} onClick={() => void submit()}>
				{submitting ? "验证中…" : "进入"}
			</Button>
		</div>
	);
}
