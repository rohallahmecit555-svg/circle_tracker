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
            Circle Tracker
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Real-time monitoring and analysis of USDC Mint/Burn and CCTP cross-chain settlements across multiple blockchains.
          </p>
          <Button
            size="lg"
            onClick={() => setLocation("/dashboard")}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            Launch Dashboard
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <Zap className="w-8 h-8 text-blue-400 mb-2" />
              <CardTitle className="text-white">Real-time Monitoring</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                Monitor USDC and CCTP contract events across Ethereum, Base, Arbitrum, and other EVM chains in real-time.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <BarChart3 className="w-8 h-8 text-green-400 mb-2" />
              <CardTitle className="text-white">Advanced Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                Analyze transaction patterns, visualize Mint/Burn trends, and track cross-chain flows with detailed filters.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <ArrowRight className="w-8 h-8 text-purple-400 mb-2" />
              <CardTitle className="text-white">Data Export</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-slate-400">
                Export transaction data to Excel or CSV for further analysis and reporting.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
