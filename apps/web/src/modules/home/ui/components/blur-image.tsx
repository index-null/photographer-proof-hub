import { cn } from "@photographer-proof-hub/ui/lib/utils";
import { type ImgHTMLAttributes, memo, useState } from "react";

type BlurImageProps = ImgHTMLAttributes<HTMLImageElement> & {
	src: string;
	alt: string;
	/** Extra callback fired after the image has finished loading. */
	onLoad?: () => void;
};

/**
 * Image with a fade-in on load. Adapted from the reference `BlurImage`, which
 * relied on `next/image` + `react-blurhash`. We keep the same fade behaviour
 * with a plain `<img>` so it works in the TanStack Start stack without extra
 * dependencies. Positioning/fill is controlled by the caller via `className`.
 */
const BlurImageInner = ({
	src,
	alt,
	className,
	onLoad,
	...props
}: BlurImageProps) => {
	const [loaded, setLoaded] = useState(false);

	return (
		<img
			src={src}
			alt={alt}
			loading="lazy"
			decoding="async"
			onLoad={() => {
				setLoaded(true);
				onLoad?.();
			}}
			className={cn(
				"transition-opacity duration-700 ease-out",
				loaded ? "opacity-100" : "opacity-0",
				className,
			)}
			{...props}
		/>
	);
};

const BlurImage = memo(BlurImageInner);
export default BlurImage;
