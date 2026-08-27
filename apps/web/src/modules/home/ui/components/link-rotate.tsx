import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { Link } from "@tanstack/react-router";

interface Props {
	link: string;
	label: string;
	className?: string;
}

/**
 * Footer link with a vertical text rotation on hover (reused from reference).
 */
const LinkRotate = ({ link, label, className }: Props) => {
	return (
		<div className="relative inline-block overflow-hidden">
			<Link
				to={link}
				className={cn(
					"group relative inline-block font-light text-foreground text-sm",
					className,
				)}
			>
				<span className="block transform transition-transform duration-300 ease-in-out group-hover:-translate-y-full">
					{label}
				</span>
				<span className="absolute inset-0 translate-y-full transform transition-transform duration-300 ease-in-out group-hover:translate-y-0">
					{label}
				</span>
			</Link>
		</div>
	);
};

export default LinkRotate;
