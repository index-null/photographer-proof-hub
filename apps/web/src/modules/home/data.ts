/**
 * Local site configuration + static showcase data.
 * Adapted from the reference `site.config.ts`. Photos point to the test
 * assets extracted into `apps/web/public/photos`.
 */
export type SocialLink = {
	title: string;
	href: string;
	primary?: boolean;
};

export const siteConfig = {
	name: "小鱼泡泡",
	tagline: "Photography",
	role: "Photographer",
	bio: "A quiet study of light, land, and the spaces in between — where the ordinary is allowed to fall still and become extraordinary.",
	initials: "鱼",
	/** Personal intro avatar. */
	avatar: "/bubble fish.jpg",
	socialLinks: [
		{ title: "Xiaohongshu", href: "https://xhslink.cn/o/7zQSUc8912e" },
		{ title: "GitHub", href: "https://github.com/index-null" },
		{
			title: "Contact me",
			href: "wechat://index_null",
			/** If true, this link gets the primary button style. */
			primary: true,
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
	src: `/photos/${i < urbani.length ? "urbani" : "ethereal"}/${seed.file}.jpg`,
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
