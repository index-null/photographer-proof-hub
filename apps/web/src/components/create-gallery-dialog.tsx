import { Button } from "@photographer-proof-hub/ui/components/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@photographer-proof-hub/ui/components/card";
import { Checkbox } from "@photographer-proof-hub/ui/components/checkbox";
import { Input } from "@photographer-proof-hub/ui/components/input";
import { Label } from "@photographer-proof-hub/ui/components/label";
import { Textarea } from "@photographer-proof-hub/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import z from "zod";

import { client, orpc } from "@/utils/orpc";
import { DEFAULT_WATERMARK, type WatermarkConfig } from "@/utils/watermark";

import WatermarkPreview from "./watermark-preview";

type GalleryFormValues = {
	name: string;
	description?: string;
	watermark: WatermarkConfig;
};

function RangeRow({
	label,
	value,
	min,
	max,
	step,
	suffix,
	onChange,
}: {
	label: string;
	value: number;
	min: number;
	max: number;
	step: number;
	suffix?: string;
	onChange: (value: number) => void;
}) {
	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between">
				<Label>{label}</Label>
				<span className="font-mono text-foreground/80 text-xs tabular-nums">
					{value}
					{suffix}
				</span>
			</div>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
				className="cn-range"
			/>
		</div>
	);
}

export default function CreateGalleryDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();

	const createMutation = useMutation({
		mutationFn: (values: GalleryFormValues) =>
			client.gallery.create({
				name: values.name.trim(),
				description: values.description?.trim() || undefined,
				watermark: values.watermark,
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: orpc.gallery.list.queryOptions().queryKey,
			});
			toast.success("选片项目已创建");
			onOpenChange(false);
		},
		onError: (error) => {
			toast.error(error.message || "创建失败");
		},
	});

	const form = useForm({
		defaultValues: {
			name: "",
			description: "",
			watermark: DEFAULT_WATERMARK,
		} as GalleryFormValues,
		onSubmit: async ({ value }) => {
			await createMutation.mutateAsync(value);
			form.reset();
		},
		validators: {
			onSubmit: z.object({
				name: z.string().min(1, "项目名称必填"),
				description: z.string().optional(),
				watermark: z.object({
					text: z.string(),
					color: z.string(),
					opacity: z.number().min(0).max(1),
					fontSize: z.number().min(4).max(200),
					rotation: z.number().min(-180).max(180),
					gapX: z.number().min(10).max(800),
					gapY: z.number().min(10).max(800),
					enabled: z.boolean(),
				}),
			}),
		},
	});

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onOpenChange(false);
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onOpenChange]);

	if (!open) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button
				type="button"
				aria-label="关闭对话框"
				className="fade-in-0 absolute inset-0 animate-in cursor-default bg-black/60 backdrop-blur-sm duration-200"
				onClick={() => onOpenChange(false)}
			/>
			<Card className="fade-in-0 zoom-in-[0.98] relative z-10 max-h-[90vh] w-full max-w-3xl animate-in overflow-y-auto duration-200 ease-emphasized">
				<CardHeader>
					<CardTitle>新建选片项目</CardTitle>
					<CardDescription>
						配置项目信息与平铺水印，创建后即可上传预览图并生成客户链接。
					</CardDescription>
					<CardAction>
						<Button
							variant="ghost"
							size="icon-sm"
							className="rounded-full"
							onClick={() => onOpenChange(false)}
							aria-label="关闭"
						>
							<X />
						</Button>
					</CardAction>
				</CardHeader>

				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							e.stopPropagation();
							form.handleSubmit();
						}}
						className="grid gap-5 md:grid-cols-2"
					>
						{/* 左列：基础信息与水印参数 */}
						<div className="space-y-5">
							<form.Field name="name">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>项目名称</Label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
										{field.state.meta.errors.map((error) => (
											<p
												key={error?.message}
												className="text-destructive text-xs"
											>
												{error?.message}
											</p>
										))}
									</div>
								)}
							</form.Field>

							<form.Field name="description">
								{(field) => (
									<div className="space-y-2">
										<Label htmlFor={field.name}>描述（可选）</Label>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
										/>
									</div>
								)}
							</form.Field>

							<div className="rounded-xl bg-muted/40 p-4 ring-1 ring-border">
								<p className="mb-4 font-medium text-sm">水印配置</p>
								<div className="space-y-4">
									<form.Field name="watermark.enabled">
										{(field) => (
											<div className="flex items-center gap-2">
												<Checkbox
													checked={field.state.value}
													onCheckedChange={(checked) =>
														field.handleChange(Boolean(checked))
													}
												/>
												<Label>启用水印</Label>
											</div>
										)}
									</form.Field>

									<form.Field name="watermark.text">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>水印文字</Label>
												<Input
													id={field.name}
													name={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="watermark.color">
										{(field) => (
											<div className="space-y-2">
												<Label htmlFor={field.name}>水印颜色</Label>
												<div className="flex items-center gap-2">
													<input
														type="color"
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														className="h-9 w-12 shrink-0 cursor-pointer rounded-lg border border-input bg-transparent p-1"
													/>
													<Input
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														className="font-mono"
													/>
												</div>
											</div>
										)}
									</form.Field>

									<form.Field name="watermark.opacity">
										{(field) => (
											<RangeRow
												label="不透明度"
												value={field.state.value}
												min={0}
												max={1}
												step={0.05}
												onChange={field.handleChange}
											/>
										)}
									</form.Field>

									<form.Field name="watermark.fontSize">
										{(field) => (
											<RangeRow
												label="字号"
												value={field.state.value}
												min={8}
												max={96}
												step={1}
												suffix="px"
												onChange={field.handleChange}
											/>
										)}
									</form.Field>

									<form.Field name="watermark.rotation">
										{(field) => (
											<RangeRow
												label="旋转角度"
												value={field.state.value}
												min={-180}
												max={180}
												step={1}
												suffix="°"
												onChange={field.handleChange}
											/>
										)}
									</form.Field>

									<form.Field name="watermark.gapX">
										{(field) => (
											<RangeRow
												label="水平间距"
												value={field.state.value}
												min={40}
												max={400}
												step={5}
												suffix="px"
												onChange={field.handleChange}
											/>
										)}
									</form.Field>

									<form.Field name="watermark.gapY">
										{(field) => (
											<RangeRow
												label="垂直间距"
												value={field.state.value}
												min={40}
												max={400}
												step={5}
												suffix="px"
												onChange={field.handleChange}
											/>
										)}
									</form.Field>
								</div>
							</div>
						</div>

						{/* 右列：实时预览 */}
						<div className="space-y-3 md:sticky md:top-0 md:self-start">
							<Label>实时预览</Label>
							<form.Subscribe selector={(state) => state.values.watermark}>
								{(watermark) => <WatermarkPreview config={watermark} />}
							</form.Subscribe>
							<p className="text-muted-foreground text-xs">
								预览基于当前配置实时平铺渲染，保存后将随项目一起写入。
							</p>
						</div>

						<div className="flex justify-end gap-2 border-t pt-5 md:col-span-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => onOpenChange(false)}
							>
								取消
							</Button>
							<form.Subscribe
								selector={(state) => ({
									canSubmit: state.canSubmit,
									isSubmitting: state.isSubmitting,
								})}
							>
								{({ canSubmit, isSubmitting }) => (
									<Button
										type="submit"
										disabled={
											!canSubmit || isSubmitting || createMutation.isPending
										}
									>
										{isSubmitting || createMutation.isPending
											? "创建中…"
											: "创建项目"}
									</Button>
								)}
							</form.Subscribe>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
