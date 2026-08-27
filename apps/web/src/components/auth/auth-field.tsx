import { Input } from "@photographer-proof-hub/ui/components/input";
import { Label } from "@photographer-proof-hub/ui/components/label";
import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/**
 * 从校验器返回的 issue（形状随适配器不同）中安全取出提示文案，
 * 避免在调用侧到处写 `error?.message` 或放宽类型。
 */
function messageOf(error: unknown): string | undefined {
	if (typeof error === "string") {
		return error;
	}
	if (error && typeof error === "object" && "message" in error) {
		const message = (error as { message?: unknown }).message;
		return typeof message === "string" ? message : undefined;
	}
	return undefined;
}

/**
 * 表单行：标签 + 输入框 + 错误提示。密码类型自带明文切换（lucide 图标，无光效）。
 */
export function AuthField({
	name,
	label,
	value,
	type = "text",
	placeholder,
	autoComplete,
	hint,
	errors,
	onChange,
	onBlur,
}: {
	name: string;
	label: string;
	value: string;
	type?: "text" | "email" | "password";
	placeholder?: string;
	autoComplete?: string;
	hint?: string;
	errors?: readonly unknown[];
	onChange: (value: string) => void;
	onBlur?: () => void;
}) {
	const [revealed, setRevealed] = useState(false);
	const isPassword = type === "password";
	const messages = (errors ?? [])
		.map(messageOf)
		.filter((message): message is string => Boolean(message));
	const invalid = messages.length > 0;

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-baseline justify-between gap-2">
				<Label htmlFor={name}>{label}</Label>
				{hint ? (
					<span className="text-muted-foreground/70 text-xs">{hint}</span>
				) : null}
			</div>

			<div className="relative">
				<Input
					id={name}
					name={name}
					type={isPassword && revealed ? "text" : type}
					value={value}
					placeholder={placeholder}
					autoComplete={autoComplete}
					aria-invalid={invalid || undefined}
					onBlur={onBlur}
					onChange={(e) => onChange(e.target.value)}
					className={cn("h-10 rounded-xl", isPassword && "pr-11")}
				/>
				{isPassword ? (
					<button
						type="button"
						aria-label={revealed ? "隐藏密码" : "显示密码"}
						onClick={() => setRevealed((prev) => !prev)}
						className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground focus-visible:text-foreground"
					>
						{revealed ? (
							<EyeOff className="size-4" />
						) : (
							<Eye className="size-4" />
						)}
					</button>
				) : null}
			</div>

			{messages.map((message) => (
				<p key={message} className="text-destructive text-xs">
					{message}
				</p>
			))}
		</div>
	);
}
