import { Button } from "@photographer-proof-hub/ui/components/button";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";

import { AuthCard } from "./auth/auth-card";
import { AuthField } from "./auth/auth-field";
import Loader from "./loader";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const navigate = useNavigate({
		from: "/",
	});
	const { isPending } = authClient.useSession();

	const form = useForm({
		defaultValues: {
			email: "",
			password: "",
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({
							to: "/dashboard",
						});
						toast.success("登录成功");
					},
					onError: (error) => {
						toast.error(error.error.message || error.error.statusText);
					},
				},
			);
		},
		validators: {
			onSubmit: z.object({
				email: z.email("邮箱格式不正确"),
				password: z.string().min(8, "密码至少需要 8 个字符"),
			}),
		},
	});

	if (isPending) {
		return <Loader />;
	}

	return (
		<AuthCard
			title="欢迎回来"
			description="登录后即可管理选片项目、水印与客户分享链接。"
			footer={
				<p className="text-muted-foreground text-sm">
					还没有账号？
					<button
						type="button"
						onClick={onSwitchToSignUp}
						className="ml-1 text-foreground underline decoration-border underline-offset-4 transition-colors duration-200 hover:decoration-foreground"
					>
						使用邀请码注册
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
							autoComplete="current-password"
							placeholder="至少 8 个字符"
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
							{isSubmitting ? "登录中…" : "登录"}
						</Button>
					)}
				</form.Subscribe>
			</form>
		</AuthCard>
	);
}
