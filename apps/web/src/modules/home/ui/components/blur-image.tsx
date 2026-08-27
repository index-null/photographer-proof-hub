import { cn } from "@photographer-proof-hub/ui/lib/utils";
import {
	type ImgHTMLAttributes,
	memo,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

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
	const imgRef = useRef<HTMLImageElement>(null);

	// 用 ref 持有最新 onLoad，保证 markLoaded 引用稳定（不随父级回调变化重建）。
	const onLoadRef = useRef(onLoad);
	onLoadRef.current = onLoad;
	const markLoaded = useCallback(() => {
		setLoaded(true);
		onLoadRef.current?.();
	}, []);

	// SSR 直出的图片命中缓存时，浏览器会在 React 完成 hydration、挂载 onLoad
	// 之前就触发 `load` 事件，导致回调被错过、图片永远停在 opacity-0（黑图）。
	// 挂载后若 <img> 已 complete 则立即标记为已加载（并通知父级）。
	useEffect(() => {
		const img = imgRef.current;
		if (img && img.complete && img.naturalWidth > 0) {
			markLoaded();
		}
	}, [src, markLoaded]);

	return (
		<img
			ref={imgRef}
			src={src}
			alt={alt}
			loading="lazy"
			decoding="async"
			onLoad={markLoaded}
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
