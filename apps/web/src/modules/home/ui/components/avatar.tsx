import { cn } from "@photographer-proof-hub/ui/lib/utils";

interface Props {
	src?: string;
	alt?: string;
	fallback: string;
	className?: string;
}

/**
 * Lightweight avatar (image with initials fallback). Replaces the shadcn
 * `Avatar` used by the reference project, which is not part of this UI package.
 */
const Avatar = ({ src, alt, fallback, className }: Props) => {
	return (
		<div
			className={cn(
				"relative flex size-15 shrink-0 overflow-hidden rounded-full bg-muted",
				className,
			)}
		>
			{src ? (
				<img src={src} alt={alt} className="h-full w-full object-cover" />
			) : (
				<span className="m-auto font-light text-lg">{fallback}</span>
			)}
		</div>
	);
};

export default Avatar;
