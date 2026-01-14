import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, BarChart3, Zap } from "lucide-react";
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
            onClick={() => setLocation("/dashboard")}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            打开仪表板
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Zap className="w-8 h-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">实时监控</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                实时监听 USDC 和 CCTP 合约事件，跨越以太坊、Base、Arbitrum 等多条 EVM 链。
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-green-400 mb-2" />
              <CardTitle className="text-white">高级分析</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                分析交易模式、可视化 Mint/Burn 趋势、追踪跨链流量，支持多维度过滤。
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <ArrowRight className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">数据导出</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                将交易数据导出为 Excel 或 CSV 格式，便于进一步分析和报告。
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
