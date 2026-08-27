import { ArrowDown } from "lucide-react";

/**
 * Section heading for the collections grid. Adapted from the reference
 * `LatestTravelCard` (links to the proofing dashboard, which is the real
 * gallery surface in this app).
 */
const CollectionsHeading = () => {
	return (
		<div className="flex w-full items-center justify-between rounded-xl bg-muted p-4 font-light lg:p-5">
			<div className="flex items-center gap-2">
				<p className="text-sm">Collections</p>
				<ArrowDown size={14} />
			</div>
		</div>
	);
};

export default CollectionsHeading;
