import { photos } from "../../data";
import PhotoTile from "../components/photo-tile";

/**
 * Flat, lazily-loaded gallery grid (right panel of the homepage). Replaces the
 * previous 2-card "collection cover" layout: all photos are tiled directly with
 * no collection-detail navigation. Native `loading="lazy"` + `decoding="async"`
 * keeps offscreen images from blocking the initial paint.
 */
export const CollectionsView = () => {
	return (
		<div className="grid w-full grid-cols-2 gap-3 md:grid-cols-3">
			{photos.map((photo) => (
				<PhotoTile key={photo.id} photo={photo} />
			))}
		</div>
	);
};
