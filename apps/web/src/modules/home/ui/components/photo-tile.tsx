import type { Photo } from "../../data";
import BlurImage from "./blur-image";
import VectorTopLeftAnimation from "./vector-top-left-animation";

interface Props {
	photo: Photo;
}

/**
 * A single photo tile in the flat gallery grid. Purely presentational — no
 * collection/detail navigation (removed per product decision). Hover reveals
 * the title label.
 */
const PhotoTile = ({ photo }: Props) => {
	return (
		<div className="group relative w-full">
			<div className="relative aspect-3/4 overflow-hidden rounded-lg bg-muted">
				<BlurImage
					src={photo.src}
					alt={photo.title}
					className="absolute inset-0 h-full w-full object-cover transition-[filter] duration-300 lg:group-hover:blur-xs"
				/>
			</div>

			<div className="absolute top-0 left-0 z-20">
				<VectorTopLeftAnimation title={photo.title} />
			</div>
		</div>
	);
};

export default PhotoTile;
