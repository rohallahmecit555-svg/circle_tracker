import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { queryHistoricalTransfers, listenToTransfers, SUPPORTED_CHAINS } from "./eventListener";

export const eventListenerRouter = router({
  /**
   * 查询指定链的历史交易数据
   */
  queryHistoricalData: publicProcedure
    .input(z.object({
      chainId: z.number(),
      fromBlock: z.number().optional().default(0),
      toBlock: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        const result = await queryHistoricalTransfers(
          input.chainId,
          input.fromBlock,
          input.toBlock
        );
        return {
          success: true,
          count: result.length,
          data: result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * 查询所有支持的链
   */
  getSupportedChains: publicProcedure
    .query(() => {
      return Object.values(SUPPORTED_CHAINS).map(chain => ({
        id: chain.id,
        name: chain.name,
        rpcUrl: chain.rpcUrl,
      }));
    }),

  /**
   * 获取链的最新区块号
   */
  getLatestBlockNumber: publicProcedure
    .input(z.object({
      chainId: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        const { getProvider } = await import("./eventListener");
        const provider = getProvider(input.chainId);
        const blockNumber = await provider.getBlockNumber();
        return {
          success: true,
          blockNumber,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),

  /**
   * 启动监听器（仅管理员）
   */
  startListener: protectedProcedure
    .input(z.object({
      chainId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // 只允许管理员启动监听器
      if (ctx.user?.role !== "admin") {
        throw new Error("Only admins can start listeners");
      }

      try {
        listenToTransfers(input.chainId);
        return {
          success: true,
          message: `Listener started for chain ${input.chainId}`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }),
});
