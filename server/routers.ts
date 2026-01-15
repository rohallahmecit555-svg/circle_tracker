import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getTransactionByHash, getTransactions, getStatistics, getAlertConfig } from "./db";
import { eventListenerRouter } from "./eventListenerRouter";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Circle Tracker routers
  eventListener: eventListenerRouter,
  tracker: router({
    // Get transaction by hash
    getTransactionByHash: publicProcedure
      .input(z.object({ txHash: z.string() }))
      .query(async ({ input }) => {
        return await getTransactionByHash(input.txHash);
      }),

    // Get transactions with filters
    getTransactions: publicProcedure
      .input(z.object({
        chainId: z.number().optional(),
        type: z.string().optional(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }))
      .query(async ({ input }) => {
        return await getTransactions({
          chainId: input.chainId,
          type: input.type,
          startTime: input.startTime,
          endTime: input.endTime,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // Get statistics
    getStatistics: publicProcedure
      .input(z.object({
        date: z.string().optional(),
        chainId: z.number().optional(),
        type: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await getStatistics({
          date: input.date,
          chainId: input.chainId,
          type: input.type,
        });
      }),

    // Get alert config for current user
    getAlertConfig: protectedProcedure
      .query(async ({ ctx }) => {
        return await getAlertConfig(ctx.user.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
