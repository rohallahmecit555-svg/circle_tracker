
import { useState, useMemo } from 'react';
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw, History } from "lucide-react";
import { useLocation } from "wouter";
import { CHAINS, TRANSACTION_TYPES, CHAIN_OPTIONS, TRANSACTION_TYPE_OPTIONS } from "@shared/constants";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface FilterState {
  chainId?: string;
  type?: string;
  searchHash?: string;
}

const getChainName = (chainId: number) => {
  const chain = Object.values(CHAINS).find(c => c.id === chainId);
  return chain?.name || "未知";
};

const getTransactionTypeColor = (type: string) => {
  switch (type) {
    case "CIRCLE_MINT":
      return "bg-green-100 text-green-800";
    case "CIRCLE_BURN":
      return "bg-red-100 text-red-800";
    case "CCTP_BURN":
      return "bg-blue-100 text-blue-800";
    case "CCTP_MINT":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getExplorerUrl = (chainId: number, txHash: string) => {
  const explorers: Record<number, string> = {
    1: "https://etherscan.io/tx",
    8453: "https://basescan.org/tx",
    42161: "https://arbiscan.io/tx",
    137: "https://polygonscan.com/tx",
    10: "https://optimistic.etherscan.io/tx",
  };
  const baseUrl = explorers[chainId] || "https://etherscan.io/tx";
  return `${baseUrl}/${txHash}`;
};

const TxHashLink = ({ txHash, chainId }: { txHash: string; chainId: number }) => {
  return (
    <a
      href={getExplorerUrl(chainId, txHash)}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono text-xs sm:text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate max-w-[120px] block"
      title={txHash}
    >
      {txHash.slice(0, 10)}...
    </a>
  );
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<FilterState>({
    chainId: undefined,
    type: undefined,
    searchHash: undefined,
  });
  const [page, setPage] = useState(0);
  const pageSize = 100;

  // 获取分页的交易列表（用于显示表格）
  const { data: transactions = [], isLoading, refetch } = trpc.tracker.getTransactions.useQuery({
    chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
    type: filters.type,
    limit: pageSize,
    offset: page * pageSize,
  });

  // 获取全局统计数据（所有交易的总和）
  const { data: summary } = trpc.tracker.getSummary.useQuery({
    chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
    type: filters.type,
  });

  const summaryStats = useMemo(() => {
    if (summary) {
      return {
        totalTransactions: summary.totalCount,
        totalMint: summary.mintAmount,
        totalBurn: summary.burnAmount,
        totalCCTPTransfers: summary.cctpAmount,
      };
    }
    return {
      totalTransactions: 0,
      totalMint: 0,
      totalBurn: 0,
      totalCCTPTransfers: 0,
    };
  }, [summary]);

  const handleExport = () => {
    const data = transactions.map(tx => ({
      "交易哈希": tx.txHash,
      "链": getChainName(tx.chainId),
      "类型": tx.type,
      "金额 (USDC)": tx.amount,
      "时间": format(new Date(tx.timestamp), "yyyy-MM-dd HH:mm:ss"),
      "状态": tx.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "交易数据");
    XLSX.writeFile(workbook, `circle-tracker-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-4 sm:px-6 sm:py-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* 头部 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 break-words">Circle 链上行为追踪器</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1 sm:mt-2 break-words">实时监控 USDC Mint/Burn 和 CCTP 跨链结算</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/history")}
              className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <History className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">历史追溯</span>
              <span className="sm:hidden">历史</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">刷新</span>
              <span className="sm:hidden">刷新</span>
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={transactions.length === 0}
              className="gap-1 sm:gap-2 flex-1 sm:flex-none text-xs sm:text-sm"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">导出 Excel</span>
              <span className="sm:hidden">导出</span>
            </Button>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 truncate">总交易数</CardTitle>
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-xl sm:text-3xl font-bold text-slate-900">{summaryStats.totalTransactions}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 truncate">总 Mint 金额</CardTitle>
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-lg sm:text-3xl font-bold text-green-600 truncate">${summaryStats.totalMint.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 truncate">总 Burn 金额</CardTitle>
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-lg sm:text-3xl font-bold text-red-600 truncate">${summaryStats.totalBurn.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-xs sm:text-sm font-medium text-slate-600 truncate">CCTP 转账</CardTitle>
            </CardHeader>
            <CardContent className="pb-2 sm:pb-4">
              <div className="text-lg sm:text-3xl font-bold text-blue-600 truncate">${summaryStats.totalCCTPTransfers.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* 过滤器 */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">过滤器</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2 block">链</label>
                <Select value={filters.chainId || "all"} onValueChange={(value) => {
                  setFilters({ ...filters, chainId: value === "all" ? undefined : value });
                  setPage(0);
                }}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="所有链" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有链</SelectItem>
                    {CHAIN_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2 block">交易类型</label>
                <Select value={filters.type || "all"} onValueChange={(value) => {
                  setFilters({ ...filters, type: value === "all" ? undefined : value });
                  setPage(0);
                }}>
                  <SelectTrigger className="text-xs sm:text-sm">
                    <SelectValue placeholder="所有类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有类型</SelectItem>
                    {TRANSACTION_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2 block">交易哈希</label>
                <Input
                  placeholder="输入交易哈希..."
                  value={filters.searchHash || ""}
                  onChange={(e) => setFilters({ ...filters, searchHash: e.target.value })}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 交易列表 */}
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">交易列表</CardTitle>
            <CardDescription className="text-xs sm:text-sm">共 {summaryStats.totalTransactions} 条交易</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-slate-500">加载中...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-slate-500">暂无数据</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="text-xs sm:text-sm">
                      <TableHead>交易哈希</TableHead>
                      <TableHead>链</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>金额 (USDC)</TableHead>
                      <TableHead>时间</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id} className="text-xs sm:text-sm">
                        <TableCell><TxHashLink txHash={tx.txHash} chainId={tx.chainId} /></TableCell>
                        <TableCell>{getChainName(tx.chainId)}</TableCell>
                        <TableCell><Badge className={getTransactionTypeColor(tx.type)}>{TRANSACTION_TYPES[tx.type as keyof typeof TRANSACTION_TYPES]}</Badge></TableCell>
                        <TableCell>{parseFloat(tx.amount.toString()).toLocaleString()}</TableCell>
                        <TableCell>{format(new Date(tx.timestamp), "MM-dd HH:mm")}</TableCell>
                        <TableCell><Badge variant="outline">{tx.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {transactions.length > 0 && (
              <div className="flex justify-between items-center mt-4 text-xs sm:text-sm">
                <span className="text-slate-600">显示 {page * pageSize + 1}-{Math.min((page + 1) * pageSize, summaryStats.totalTransactions)} / {summaryStats.totalTransactions}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    上一页
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * pageSize >= summaryStats.totalTransactions}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
