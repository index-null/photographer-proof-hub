import { SiTiktok, SiXiaohongshu } from "@icons-pack/react-simple-icons";
import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { ArrowUpRight, type LucideIcon, Mail } from "lucide-react";

import type { SocialLinkType } from "../../data";

// Real brand logos via Simple Icons (lucide v1 dropped brand icons).
// Keyed by `SocialLink.type`, never by display title, so titles stay localizable.
// NOTE: Simple Icons has no dedicated `Douyin` entry; Douyin and TikTok share the
// exact same note glyph (ByteDance), so `SiTiktok` is the correct icon for 抖音.
type BrandIcon = LucideIcon | typeof SiXiaohongshu | typeof SiTiktok;
const iconMap: Record<SocialLinkType, { Icon: BrandIcon; color?: string }> = {
	xiaohongshu: { Icon: SiXiaohongshu, color: "#FF2442" },
	contact: { Icon: Mail },
	douyin: { Icon: SiTiktok },
};

interface Props {
	type: SocialLinkType;
	title: string;
	href: string;
	className?: string;
}

/**
 * Social/contact row with an arrow that swaps in on hover. Adapted from the
 * reference `ContactCard` (react-icons replaced with lucide-react).
 */
const ContactCard = ({ type, title, href, className }: Props) => {
	const { Icon, color } = iconMap[type] ?? iconMap.contact;

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
