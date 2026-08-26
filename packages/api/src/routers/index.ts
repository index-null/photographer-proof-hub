import type { RouterClient } from "@orpc/server";

import { protectedProcedure, publicProcedure } from "../index";
import { galleryRouter } from "./gallery";
import { guestRouter } from "./guest";
import { photoRouter } from "./photo";
import { shareLinkRouter } from "./share_link";

export const appRouter = {
	healthCheck: publicProcedure.handler(() => {
		return "OK";
	}),
	privateData: protectedProcedure.handler(({ context }) => {
		return {
			message: "This is private",
			user: context.session?.user,
		};
	}),
	guest: guestRouter,
	gallery: galleryRouter,
	photo: photoRouter,
	shareLink: shareLinkRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
