"use client";

import Autoplay from "embla-carousel-autoplay";
import useEmblaCarousel from "embla-carousel-react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";

interface CarouselProps {
	children: ReactNode;
	className?: string;
	containerClassName?: string;
	autoplayDelay?: number;
	/**
	 * When `true` the autoplay timer is suspended (e.g. while the current
	 * slide's image is still loading) so it never advances into a blank frame.
	 */
	paused?: boolean;
	/** Notified whenever the active slide changes. */
	onSelectChange?: (index: number) => void;
}

/**
 * Full-bleed image carousel with prev/next controls and autoplay.
 * Reused verbatim from the reference `photo-carousel` (embla-carousel-react).
 * The bottom dot/progress bar has been removed; slide readiness is owned by
 * the parent via the `paused` / `onSelectChange` props for lazy loading.
 */
const Carousel = ({
	children,
	className = "",
	containerClassName = "",
	autoplayDelay = 6000,
	paused = false,
	onSelectChange,
}: CarouselProps) => {
	const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [
		Autoplay({
			delay: autoplayDelay,
			stopOnInteraction: false,
			playOnInit: false,
		}),
	]);

	const onSelectChangeRef = useRef(onSelectChange);
	onSelectChangeRef.current = onSelectChange;

	const emitSelect = useCallback(() => {
		if (!emblaApi) return;
		onSelectChangeRef.current?.(emblaApi.selectedScrollSnap());
	}, [emblaApi]);

	useEffect(() => {
		if (!emblaApi) return;

		emitSelect();
		emblaApi.on("select", emitSelect);

		return () => {
			emblaApi.off("select", emitSelect);
		};
	}, [emblaApi, emitSelect]);

	useEffect(() => {
		if (!emblaApi) return;
		const autoplay = emblaApi.plugins().autoplay;
		if (!autoplay) return;

		if (paused) autoplay.stop();
		else autoplay.play();
	}, [emblaApi, paused]);

	return (
		<div className={`relative overflow-hidden ${className}`} ref={emblaRef}>
			<div className={`flex ${containerClassName}`}>{children}</div>

			{/* Navigation Buttons */}
			<div className="pointer-events-none absolute inset-y-0 right-0 left-0 hidden items-center justify-between px-8 lg:flex">
				<button
					type="button"
					className="pointer-events-auto flex size-10 items-center justify-center rounded-md bg-black/15 text-white backdrop-blur-sm"
					aria-label="Previous"
					onClick={() => emblaApi?.scrollPrev()}
				>
					<svg
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M15 19l-7-7 7-7"
						/>
					</svg>
				</button>
				<button
					type="button"
					className="pointer-events-auto flex size-10 items-center justify-center rounded-md bg-black/15 text-white backdrop-blur-sm"
					aria-label="Next"
					onClick={() => emblaApi?.scrollNext()}
				>
					<svg
						className="h-6 w-6"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
};

export default Carousel;
