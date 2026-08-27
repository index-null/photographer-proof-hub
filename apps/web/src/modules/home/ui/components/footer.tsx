import { siteConfig } from "../../data";
import LinkRotate from "./link-rotate";

/**
 * Site footer. Adapted from the reference `Footer` (next/link + react-icons
 * replaced; nav links point to the routes that exist in this app).
 */
const Footer = () => {
	return (
		<div className="flex flex-1 flex-col items-center gap-8 rounded-xl bg-black p-16 pb-12 font-light text-white lg:items-start lg:gap-16">
			<div className="grid w-full grid-cols-1 gap-7 lg:grid-cols-2 lg:gap-14">
				<FooterNav
					title="Pages"
					links={[
						{ title: "Home", href: "/" },
						{ title: "Dashboard", href: "/dashboard" },
					]}
				/>
				<FooterNav
					title="Collections"
					links={[
						{ title: "孤独的色彩", href: "/dashboard" },
						{ title: "虚幻之地", href: "/dashboard" },
					]}
				/>
			</div>

			<div className="text-center text-xs md:text-left md:text-sm">
				<p>
					<span className="opacity-60">© {new Date().getFullYear()} </span>
					<span className="underline underline-offset-2">
						{siteConfig.name}
					</span>
					<span className="opacity-60">. All rights reserved.</span>
				</p>
			</div>
		</div>
	);
};

const FooterNav = ({
	title,
	links,
}: {
	title: string;
	links: { title: string; href: string }[];
}) => {
	return (
		<div className="flex flex-col items-center gap-8 lg:items-start">
			<h1>{title}</h1>
			<ul className="flex flex-col items-center gap-3 text-sm opacity-60 lg:items-start lg:gap-5">
				{links.map((link) => (
					<li key={link.href}>
						<LinkRotate link={link.href} label={link.title} />
					</li>
				))}
			</ul>
		</div>
	);
};

export default Footer;
