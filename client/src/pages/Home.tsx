import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, Zap, Database } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Circle 链上行为追踪器
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            实时监控和分析 USDC Mint/Burn 和 CCTP 跨链结算，支持以太坊、Base、Arbitrum 等多条区块链。
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/real-time")}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            开始监听
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
          <Card 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/real-time")}
          >
            <CardHeader>
              <Zap className="w-8 h-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">实时监听</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                查询链上历史数据或启动实时监听器，捕获真实的 USDC Mint/Burn 交易。
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/dashboard")}
          >
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-green-400 mb-2" />
              <CardTitle className="text-white">仪表板</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                查看实时交易数据、统计信息和过滤器，支持导出为 Excel。
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className="bg-slate-800 border-slate-700 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setLocation("/history")}
          >
            <CardHeader>
              <Database className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">历史追踪</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                按日期范围和链类型查询历史交易，进行时间段对比分析。
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <ArrowRight className="w-8 h-8 text-orange-400 mb-2" />
              <CardTitle className="text-white">数据导出</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                将交易数据导出为 Excel 或 CSV 格式，便于进一步分析和报告。
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <div className="mt-20 bg-slate-800 border border-slate-700 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-white mb-4">支持的区块链</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              "Ethereum",
              "Base",
              "Arbitrum",
              "Polygon",
              "Optimism",
              "Avalanche",
            ].map((chain) => (
              <div
                key={chain}
                className="bg-slate-700 rounded-lg p-4 text-center text-slate-300 hover:bg-slate-600 transition-colors"
              >
                {chain}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
