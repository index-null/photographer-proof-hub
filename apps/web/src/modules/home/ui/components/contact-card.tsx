import { SiGithub, SiXiaohongshu } from "@icons-pack/react-simple-icons";
import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { ArrowUpRight, type LucideIcon, Mail } from "lucide-react";

// Real brand logos via Simple Icons (lucide v1 dropped brand icons).
type BrandIcon = LucideIcon | typeof SiGithub;
const iconMap: Record<string, { Icon: BrandIcon; color?: string }> = {
	Xiaohongshu: { Icon: SiXiaohongshu, color: "#FF2442" },
	GitHub: { Icon: SiGithub },
	"Contact me": { Icon: Mail },
};

interface Props {
	title: string;
	href: string;
	className?: string;
}

/**
 * Social/contact row with an arrow that swaps in on hover. Adapted from the
 * reference `ContactCard` (react-icons replaced with lucide-react).
 */
const ContactCard = ({ title, href, className }: Props) => {
	const { Icon, color } = iconMap[title] ?? { Icon: Mail };

	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className={cn(
				"group flex h-full w-full cursor-pointer items-center justify-between rounded-xl bg-muted p-3 font-light transition-all duration-150 ease-emphasized hover:bg-muted-foreground/10 lg:p-5",
				className,
			)}
		>
			<p className="text-sm">{title}</p>

			<div className="relative inline-block size-4.5 overflow-hidden">
				<div className="group relative inline-block h-full w-full font-light text-sm">
					<span className="block transform transition-transform duration-200 ease-in-out group-hover:-translate-y-full">
						<Icon size={18} color={color} />
					</span>
					<span className="absolute inset-0 translate-y-full transition-transform duration-200 ease-in-out group-hover:translate-y-0">
						<ArrowUpRight size={18} />
					</span>
				</div>
			</div>
		</a>
	);
};

export default ContactCard;
