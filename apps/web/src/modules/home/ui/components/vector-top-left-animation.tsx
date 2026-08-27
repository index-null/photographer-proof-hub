import { ArrowRight } from "lucide-react";
import Graphic from "./graphic";

interface Props {
	title: string;
}

/**
 * Corner label + animated arrow that appears on the top-left of a photo card
 * on hover. Adapted from the reference `VectorTopLeftAnimation` (react-icons
 * replaced with lucide-react).
 */
const VectorTopLeftAnimation = ({ title }: Props) => {
	return (
		<div className="relative rounded-br-[18px] bg-background">
			<div className="overflow-hidden px-4 pt-2 pb-3">
				<div className="flex items-center font-light text-sm">
					<p>{title}</p>
					<div className="w-0 overflow-hidden transition-[width] duration-300 ease-out group-hover:w-6">
						<ArrowRight size={14} className="ml-2 shrink-0" />
					</div>
				</div>
			</div>

			<div className="absolute size-4.5">
				<Graphic />
			</div>

			<div className="absolute top-0 -right-4.5 size-4.5">
				<Graphic />
			</div>
		</div>
	);
};

export default VectorTopLeftAnimation;
