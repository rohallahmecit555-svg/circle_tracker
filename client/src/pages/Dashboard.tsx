'use client';

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
  const pageSize = 20;

  const { data: transactions = [], isLoading, refetch } = trpc.tracker.getTransactions.useQuery({
    chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
    type: filters.type,
    limit: pageSize,
    offset: page * pageSize,
  });

  const summaryStats = useMemo(() => {
    let totalTransactions = 0;
    let totalMint = 0;
    let totalBurn = 0;
    let totalCCTPTransfers = 0;

    for (const tx of transactions) {
      totalTransactions++;
      const amount = parseFloat(tx.amount || "0");
      if (tx.type === "CIRCLE_MINT") {
        totalMint += amount;
      } else if (tx.type === "CIRCLE_BURN") {
        totalBurn += amount;
      } else if (tx.type === "CCTP_MINT" || tx.type === "CCTP_BURN") {
        totalCCTPTransfers += amount;
      }
    }

    return {
      totalTransactions,
      totalMint,
      totalBurn,
      totalCCTPTransfers,
    };
  }, [transactions]);

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

              <div className="sm:col-span-2 lg:col-span-2">
                <label className="text-xs sm:text-sm font-medium text-slate-700 mb-1 sm:mb-2 block">交易哈希</label>
                <Input
                  placeholder="输入交易哈希..."
                  value={filters.searchHash || ""}
                  onChange={(e) => {
                    setFilters({ ...filters, searchHash: e.target.value });
                    setPage(0);
                  }}
                  className="text-xs sm:text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 交易表格 */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-base sm:text-lg">交易列表</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {isLoading ? "加载中..." : `共 ${transactions.length} 条交易`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {/* 桌面版表格 */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">交易哈希</TableHead>
                    <TableHead className="text-xs sm:text-sm">链</TableHead>
                    <TableHead className="text-xs sm:text-sm">类型</TableHead>
                    <TableHead className="text-xs sm:text-sm text-right">金额 (USDC)</TableHead>
                    <TableHead className="text-xs sm:text-sm">时间</TableHead>
                    <TableHead className="text-xs sm:text-sm">状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-slate-50">
                      <TableCell className="font-mono text-xs sm:text-sm truncate max-w-[120px]">
                        <TxHashLink txHash={tx.txHash} chainId={tx.chainId} />
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">{getChainName(tx.chainId)}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge className={`${getTransactionTypeColor(tx.type)} text-xs`}>
                          {tx.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-medium">{parseFloat(tx.amount || "0").toLocaleString()}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">{format(new Date(tx.timestamp), "MM-dd HH:mm")}</TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 手机版卡片列表 */}
            <div className="sm:hidden space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="border border-slate-200 rounded-lg p-4 bg-gradient-to-br from-slate-50 to-white shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Badge className={`${getTransactionTypeColor(tx.type)} text-xs font-semibold`}>
                        {tx.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {getChainName(tx.chainId)}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs text-slate-600">{tx.status}</Badge>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-1.5 font-medium">交易哈希</p>
                    <button
                      onClick={() => window.open(getExplorerUrl(tx.chainId, tx.txHash), '_blank')}
                      className="w-full px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded text-blue-700 font-mono text-xs font-semibold transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{tx.txHash.slice(0, 20)}...</span>
                      <span className="ml-2 text-blue-500 flex-shrink-0">→</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-white rounded border border-slate-100 p-2.5">
                      <p className="text-xs text-slate-500 mb-1 font-medium">金额</p>
                      <p className="text-sm font-bold text-slate-900">{parseFloat(tx.amount || "0").toLocaleString()}</p>
                      <p className="text-xs text-slate-500 mt-0.5">USDC</p>
                    </div>
                    <div className="bg-white rounded border border-slate-100 p-2.5">
                      <p className="text-xs text-slate-500 mb-1 font-medium">时间</p>
                      <p className="text-sm font-bold text-slate-900">{format(new Date(tx.timestamp), "MM-dd")}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{format(new Date(tx.timestamp), "HH:mm")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {transactions.length === 0 && !isLoading && (
              <div className="text-center py-8 sm:py-12">
                <p className="text-slate-500 text-sm sm:text-base">暂无交易数据</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分页 */}
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="text-xs sm:text-sm"
          >
            上一页
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-slate-600">第 {page + 1} 页</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={transactions.length < pageSize}
            className="text-xs sm:text-sm"
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
