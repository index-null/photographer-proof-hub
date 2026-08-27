import { createFileRoute } from "@tanstack/react-router";
import CollectionsHeading from "@/modules/home/ui/components/collections-heading";
import Footer from "@/modules/home/ui/components/footer";
import ProfileCard from "@/modules/home/ui/components/profile-card";
import { CollectionsView } from "@/modules/home/ui/views/collections-view";
import { SliderView } from "@/modules/home/ui/views/slider-view";

export const Route = createFileRoute("/")({
	component: HomeComponent,
});

function HomeComponent() {
	return (
		<div className="h-full overflow-y-auto bg-background">
			<div className="mx-auto flex max-w-[1600px] flex-col gap-3 p-3 lg:flex-row">
				{/* LEFT — fixed full-height photo carousel */}
				<div className="h-[60vh] lg:sticky lg:top-3 lg:h-[calc(100svh-4.5rem)] lg:w-1/2">
					<SliderView />
				</div>

				{/* RIGHT — scrollable content column */}
				<div className="flex w-full flex-col gap-3 lg:w-1/2">
					<ProfileCard />
					<CollectionsHeading />
					<CollectionsView />
					<Footer />
				</div>
			</div>
		</div>
	);
}
