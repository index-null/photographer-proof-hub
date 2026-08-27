import { ImageOff } from "lucide-react";
import { useState } from "react";
import { shuffledPhotos } from "../../data";
import BlurImage from "../components/blur-image";
import Carousel from "../components/photo-carousel";

/**
 * How many slides on each side of the active one are mounted/loaded. Keeping
 * this small means off-screen images are never requested on first paint, while
 * the immediate neighbour is preloaded so autoplay never lands on a blank frame.
 */
const SLIDE_WINDOW = 1;

/**
 * Full-height photo carousel (left panel of the homepage). Adapted from the
 * reference `SliderView` — the tRPC `getManyLikePhotos` query is replaced by
 * the static `photos` list sourced from local test assets.
 */
export const SliderView = () => {
	const [selectedIndex, setSelectedIndex] = useState(0);
	// Tracks which slides have finished loading; used both for the fade-in and
	// to decide whether autoplay may advance (prevents black frames).
	const [loaded, setLoaded] = useState<Record<number, boolean>>({});

	if (shuffledPhotos.length === 0) {
		return (
			<div className="flex h-full w-full items-center justify-center rounded-xl bg-muted">
				<div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
					<ImageOff className="h-12 w-12" />
					<p className="text-sm">No photos yet</p>
				</div>
			</div>
		);
	}

	// Render an <img> when it is near the active slide, or once it has loaded
	// before (kept mounted so re-entry is instant and never re-fetches).
	const shouldRender = (index: number) =>
		Math.abs(index - selectedIndex) <= SLIDE_WINDOW || loaded[index];

	// Don't advance to the next slide until the current one is actually painted.
	const paused = !loaded[selectedIndex];

	return (
		<div className="relative h-full w-full overflow-hidden rounded-xl">
			<Carousel
				className="absolute inset-0 h-full w-full rounded-xl"
				containerClassName="h-full"
				paused={paused}
				onSelectChange={setSelectedIndex}
			>
				{shuffledPhotos.map((photo, index) => {
					const load = shouldRender(index);

					return (
						<div key={photo.id} className="relative h-full flex-[0_0_100%]">
							{load ? (
								<BlurImage
									src={photo.src}
									alt={photo.title}
									loading={index === 0 ? "eager" : "lazy"}
									onLoad={() =>
										setLoaded((prev) => ({ ...prev, [index]: true }))
									}
									className="absolute inset-0 h-full w-full object-cover"
								/>
							) : (
								<div className="absolute inset-0 h-full w-full bg-muted" />
							)}
						</div>
					);
				})}
			</Carousel>
		</div>
	);
};
