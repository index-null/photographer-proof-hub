/**
 * Local site configuration + static showcase data.
 * Adapted from the reference `site.config.ts`. Photos point to the test
 * assets extracted into `apps/web/public/photos`.
 */
export type SocialLinkType = "xiaohongshu" | "douyin" | "contact";

export type SocialLink = {
	/** Stable key used to pick the brand icon (not the display title). */
	type: SocialLinkType;
	title: string;
	href: string;
	primary?: boolean;
};

export const siteConfig = {
	name: "小鱼泡泡",
	websiteTitle: "小鱼泡泡的摄影站",
	tagline: "Photography",
	role: "独立摄影师",
	bio: "我是小鱼泡泡📸\n独立摄影师，主营婚礼、订婚、周岁纪实、个人写真跟拍。\n主打自然氛围感，全程耐心引导。\n您可在此网站线上选片，安心省心，期待定格你的珍贵瞬间。❤️",
	initials: "鱼",
	/** Personal intro avatar. */
	avatar: "/bubble fish.webp",
	socialLinks: [
		{
			type: "xiaohongshu",
			title: "小红书",
			href: "https://xhslink.cn/o/7zQSUc8912e",
		},
		{
			type: "contact",
			title: "联系我",
			href: "wechat://index_null",
			/** If true, this link gets the primary button style. */
			primary: true,
		},
		{
			type: "douyin",
			title: "抖音",
			href: "https://www.iesdouyin.com/share/user/MS4wLjABAAAAzZdmGgwOjmL42tkLfaKuACV2Yoo6pIH6r1hs0PGH_98nJ7TDTjdlEUy1wj2Bh2oR?iid=MS4wLjABAAAAGhMHjq1zTsslxIDDam44U5kWZMGd6DPeGlPxDAUsb_qX3wdav9iSUIX5_xJEd7yW",
		},
	] satisfies SocialLink[],
};

export type Photo = {
	id: string;
	src: string;
	title: string;
};

type PhotoSeed = { file: string; title: string };

const urbani: PhotoSeed[] = [
	{ file: "nostalgia", title: "Where yesterday lingers" },
	{ file: "solitude", title: "The art of being alone" },
	{ file: "driftwood", title: "Worn smooth by the tide" },
	{ file: "quietude", title: "Stillness, undisturbed" },
	{ file: "ember", title: "The last warmth of dusk" },
	{ file: "wanderlust", title: "A restlessness of the heart" },
	{ file: "serene", title: "Calm, held in a breath" },
	{ file: "mistral", title: "Wind across the cold plains" },
	{ file: "luminescence", title: "Soft light, barely there" },
];

const ethereal: PhotoSeed[] = [
	{ file: "reverie", title: "A daydream left open" },
	{ file: "cascade", title: "Falling, then falling again" },
	{ file: "dusk", title: "The hour between worlds" },
	{ file: "fragile", title: "Beautiful, and breakable" },
	{ file: "halo", title: "Light that forgives" },
	{ file: "whisper", title: "Almost, but not quite said" },
	{ file: "horizon", title: "The line we never reach" },
	{ file: "murmur", title: "The river's low confession" },
	{ file: "twilight", title: "Purple stealing the sky" },
	{ file: "echo", title: "A sound returning late" },
	{ file: "bloom", title: "Quietly, into color" },
	{ file: "stillness", title: "The world, paused" },
];

export const photos: Photo[] = [...urbani, ...ethereal].map((seed, i) => ({
	id: `photo-${i}`,
	src: `/photos/${i < urbani.length ? "urbani" : "ethereal"}/${seed.file}.webp`,
	title: seed.title,
}));

/**
 * Deterministic seeded shuffle (fixed seed) so the left carousel order is
 * "shuffled" to avoid same-style adjacency / aesthetic fatigue, while remaining
 * identical between server and client renders (no hydration mismatch).
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
	let s = seed;
	const rand = () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
	const a = arr.slice();
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

export const shuffledPhotos = seededShuffle(photos, 1337);
