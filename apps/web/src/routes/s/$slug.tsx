import { createFileRoute } from "@tanstack/react-router";

import { AccessGate } from "@/components/guest/access-gate";
import { GalleryView } from "@/components/guest/gallery-view";
import { useAntiTheft } from "@/components/guest/use-anti-theft";
import { useGuest } from "@/components/guest/use-guest";

export const Route = createFileRoute("/s/$slug")({
	ssr: false,
	component: SharePage,
});

function SharePage() {
	const { slug } = Route.useParams();
	const { state, clientKey, submitCode, toggleStar } = useGuest(slug);
	useAntiTheft();

	if (state.phase !== "browse" || !state.gallery || !state.token) {
		return (
			<AccessGate
				phase={state.phase}
				error={state.error}
				onSubmit={submitCode}
			/>
		);
	}

	return (
		<GalleryView
			gallery={state.gallery}
			photos={state.photos}
			token={state.token}
			slug={slug}
			clientKey={clientKey}
			onToggleStar={toggleStar}
		/>
	);
}
