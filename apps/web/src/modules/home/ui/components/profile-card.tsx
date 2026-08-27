import { ArrowUpRight } from "lucide-react";
import { siteConfig } from "../../data";
import Avatar from "./avatar";
import ContactCard from "./contact-card";

/**
 * Profile / bio card with social contact rows. Adapted from the reference
 * `ProfileCard` (next/link + react-icons replaced; avatar falls back to
 * initials since no image is configured yet).
 */
const ProfileCard = () => {
	return (
		<div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
			<div className="col-span-1 md:col-span-2 lg:col-span-1 xl:col-span-2">
				<div className="group relative flex h-full flex-col justify-between gap-6 rounded-xl bg-neutral-900 p-6 font-light text-white transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-neutral-800 lg:p-10 xl:gap-0">
					<div className="flex items-center gap-4">
						<Avatar
							src={siteConfig.avatar}
							alt="Avatar"
							fallback={siteConfig.initials}
						/>

						<div className="flex flex-col gap-0.5">
							<h1 className="text-lg text-white">{siteConfig.name}</h1>
							<p className="text-sm text-white/70">{siteConfig.role}</p>
						</div>
					</div>

					<div className="lg:mt-4 xl:mt-0">
						<p className="text-[15px] text-white/70">{siteConfig.bio}</p>
					</div>

					<div className="absolute top-8 right-8 opacity-0 transition-all duration-300 ease-in-out group-hover:top-6 group-hover:right-6 group-hover:opacity-100">
						<ArrowUpRight size={18} />
					</div>
				</div>
			</div>

			<div className="col-span-1 flex flex-col justify-between gap-3 md:col-span-1 lg:col-span-1 xl:col-span-1">
				{siteConfig.socialLinks.map((link) => (
					<ContactCard
						key={link.title}
						title={link.title}
						href={link.href}
						{...(link.primary && {
							className:
								"bg-primary text-primary-foreground hover:bg-primary hover:opacity-90",
						})}
					/>
				))}
			</div>
		</div>
	);
};

export default ProfileCard;
