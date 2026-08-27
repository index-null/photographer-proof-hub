import { Button } from "@photographer-proof-hub/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { client } from "@/utils/orpc";

import { AuthCard } from "./auth/auth-card";
import { AuthField } from "./auth/auth-field";
import Loader from "./loader";

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
			name: "",
			inviteCode: "",
		},
		onSubmit: async ({ value }) => {
			// 1. 预校验邀请码，无效则中止注册（强约束消费在 Better Auth 注册钩子里完成）
			let verified: { valid: boolean; reason?: string };
			try {
				verified = await client.invite.verify({ code: value.inviteCode });
			} catch {
				toast.error("邀请码校验服务异常，请稍后重试");
				return;
			}
			if (!verified.valid) {
				toast.error(verified.reason ?? "邀请码无效");
				return;
			}

			// 2. 注册：把邀请码一并提交，服务端钩子会原子消费并写入 inviteCodeId；
			//    无有效码时整条注册被拒绝（无法绕过前端直连注册）。
			// `inviteCode` 为一次性字段：better-auth 在 sign-up 的 Zod body 上以
			// `ZodRecord` 透传（服务端钩子从 `context.body` 读取并原子消费），
			// 但未纳入客户端 `signUp.email` 的推断类型，故在此以参数类型安全断言。
			const result = await authClient.signUp.email({
				email: value.email,
				password: value.password,
				name: value.name,
				inviteCode: value.inviteCode,
			} as Parameters<typeof authClient.signUp.email>[0]);
			if (result.error) {
				toast.error(result.error.message || "注册失败");
				return;
			}

			navigate({ to: "/dashboard" });
			toast.success("注册成功");
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(2, "昵称至少需要 2 个字符"),
				email: z.email("邮箱格式不正确"),
				password: z.string().min(8, "密码至少需要 8 个字符"),
				inviteCode: z.string().min(1, "请输入邀请码"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<AuthCard
			title="创建账号"
			description="内测阶段仅限邀请注册，注册后即可创建选片项目。"
			footer={
				<p className="text-muted-foreground text-sm">
					已有账号？
					<button
						type="button"
						onClick={onSwitchToSignIn}
						className="ml-1 text-foreground underline decoration-border underline-offset-4 transition-colors duration-200 hover:decoration-foreground"
					>
						前往登录
					</button>
				</p>
			}
		>
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-5"
			>
				<form.Field name="name">
					{(field) => (
						<AuthField
							name={field.name}
							label="昵称"
							autoComplete="nickname"
							placeholder="客户看到的名字"
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>

				<form.Field name="email">
					{(field) => (
						<AuthField
							name={field.name}
							label="邮箱"
							type="email"
							autoComplete="email"
							placeholder="you@example.com"
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>

				<form.Field name="password">
					{(field) => (
						<AuthField
							name={field.name}
							label="密码"
							type="password"
							autoComplete="new-password"
							placeholder="至少 8 个字符"
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>

				<form.Field name="inviteCode">
					{(field) => (
						<AuthField
							name={field.name}
							label="邀请码"
							hint="内测必填"
							placeholder="请输入邀请码"
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>

				<form.Subscribe
					selector={(state) => ({
						canSubmit: state.canSubmit,
						isSubmitting: state.isSubmitting,
					})}
				>
					{({ canSubmit, isSubmitting }) => (
						<Button
							type="submit"
							size="lg"
							className="mt-1 w-full rounded-xl"
							disabled={!canSubmit || isSubmitting}
						>
							{isSubmitting ? "注册中…" : "创建账号"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</AuthCard>
	);
}
