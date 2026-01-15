import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function RealTimeMonitor() {
  const [selectedChain, setSelectedChain] = useState<string>("");
  const [fromBlock, setFromBlock] = useState<string>("0");
  const [toBlock, setToBlock] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);

  const supportedChainsQuery = trpc.eventListener.getSupportedChains.useQuery();
  const latestBlockQuery = trpc.eventListener.getLatestBlockNumber.useQuery(
    { chainId: selectedChain ? parseInt(selectedChain) : 1 },
    { enabled: !!selectedChain }
  );
  const queryHistoricalMutation = trpc.eventListener.queryHistoricalData.useMutation();
  const startListenerMutation = trpc.eventListener.startListener.useMutation();

  const handleQueryHistory = async () => {
    if (!selectedChain) {
      toast.error("请选择一条链");
      return;
    }

    setIsLoading(true);
    try {
      const result = await queryHistoricalMutation.mutateAsync({
        chainId: parseInt(selectedChain),
        fromBlock: parseInt(fromBlock) || 0,
        toBlock: toBlock ? parseInt(toBlock) : undefined,
      });

      setQueryResult(result);
      if (result.success) {
        toast.success(`成功查询 ${result.count} 条交易`);
      } else {
        toast.error(`查询失败: ${result.error}`);
      }
    } catch (error) {
      toast.error("查询失败");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartListener = async () => {
    if (!selectedChain) {
      toast.error("请选择一条链");
      return;
    }

    try {
      const result = await startListenerMutation.mutateAsync({
        chainId: parseInt(selectedChain),
      });

      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(`启动失败: ${result.error}`);
      }
    } catch (error) {
      toast.error("启动监听器失败");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">实时监听与历史数据</h1>
          <p className="text-muted-foreground">查询链上历史交易数据或启动实时监听器</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 查询历史数据 */}
          <Card>
            <CardHeader>
              <CardTitle>查询历史数据</CardTitle>
              <CardDescription>从链上查询过去的 USDC Mint/Burn 交易</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">选择链</label>
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择区块链" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedChainsQuery.data?.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id.toString()}>
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">起始区块</label>
                  <Input
                    type="number"
                    value={fromBlock}
                    onChange={(e) => setFromBlock(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">结束区块</label>
                  <Input
                    type="number"
                    value={toBlock}
                    onChange={(e) => setToBlock(e.target.value)}
                    placeholder="最新"
                  />
                </div>
              </div>

              {latestBlockQuery.data && (
                <p className="text-xs text-muted-foreground">
                  当前最新区块: {latestBlockQuery.data.blockNumber}
                </p>
              )}

              <Button
                onClick={handleQueryHistory}
                disabled={isLoading || !selectedChain}
                className="w-full"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                查询历史数据
              </Button>

              {queryResult && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  {queryResult.success ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">查询成功</p>
                        <p className="text-sm text-muted-foreground">
                          找到 {queryResult.count} 条交易记录
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">查询失败</p>
                        <p className="text-sm text-muted-foreground">{queryResult.error}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 启动实时监听 */}
          <Card>
            <CardHeader>
              <CardTitle>启动实时监听</CardTitle>
              <CardDescription>启动后端监听器，实时捕获新的交易事件</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">选择链</label>
                <Select value={selectedChain} onValueChange={setSelectedChain}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择区块链" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedChainsQuery.data?.map((chain) => (
                      <SelectItem key={chain.id} value={chain.id.toString()}>
                        {chain.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>说明：</strong>启动监听器后，系统将持续监听选定链上的 USDC Transfer 事件，自动捕获 Circle Mint 和 CCTP 交易，并存储到数据库。
                </p>
              </div>

              <Button
                onClick={handleStartListener}
                disabled={!selectedChain}
                className="w-full"
                variant="default"
              >
                {startListenerMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                启动监听器
              </Button>

              <div className="p-4 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-2">支持的链：</p>
                <ul className="space-y-1 text-muted-foreground">
                  {supportedChainsQuery.data?.map((chain) => (
                    <li key={chain.id}>• {chain.name}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 查询结果详情 */}
        {queryResult?.success && queryResult?.data?.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>查询结果</CardTitle>
              <CardDescription>找到 {queryResult.count} 条交易</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">交易哈希</th>
                      <th className="text-left py-2 px-4 font-medium">类型</th>
                      <th className="text-left py-2 px-4 font-medium">金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queryResult.data.map((tx: any, idx: number) => (
                      <tr key={idx} className="border-b hover:bg-muted">
                        <td className="py-2 px-4 font-mono text-xs">
                          {tx.txHash.slice(0, 10)}...
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            tx.type === 'CIRCLE_MINT' ? 'bg-green-100 text-green-800' :
                            tx.type === 'CIRCLE_BURN' ? 'bg-red-100 text-red-800' :
                            tx.type === 'CCTP_MINT' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2 px-4">${parseFloat(tx.amount).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
