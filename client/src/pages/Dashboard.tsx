import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, RefreshCw } from "lucide-react";
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

export default function Dashboard() {
  const [filters, setFilters] = useState<FilterState>({
    chainId: undefined,
    type: undefined,
    searchHash: undefined,
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data: transactions = [], isLoading, refetch } = trpc.tracker.getTransactions.useQuery(
    {
      chainId: filters.chainId ? parseInt(filters.chainId) : undefined,
      type: filters.type,
      limit: pageSize,
      offset: page * pageSize,
    },
    { enabled: true }
  );

  const { data: statistics = [] } = trpc.tracker.getStatistics.useQuery(
    {
      date: format(new Date(), "yyyy-MM-dd"),
    },
    { enabled: true }
  );

  const summaryStats = useMemo(() => {
    const stats = {
      totalMint: 0,
      totalBurn: 0,
      totalCCTPTransfers: 0,
      totalTransactions: transactions.length,
    };

    transactions.forEach(tx => {
      const amount = parseFloat(tx.amount.toString());
      if (tx.type === "CIRCLE_MINT") stats.totalMint += amount;
      if (tx.type === "CIRCLE_BURN") stats.totalBurn += amount;
      if (tx.type === "CCTP_BURN" || tx.type === "CCTP_MINT") stats.totalCCTPTransfers += amount;
    });

    return stats;
  }, [transactions]);

  const handleExport = () => {
    const data = transactions.map(tx => ({
      "交易哈希": tx.txHash,
      "链": getChainName(tx.chainId),
      "类型": TRANSACTION_TYPES[tx.type as keyof typeof TRANSACTION_TYPES],
      "金额 (USDC)": tx.amount.toString(),
      "发送方": tx.fromAddress,
      "接收方": tx.toAddress,
      "时间": format(new Date(tx.timestamp), "yyyy-MM-dd HH:mm:ss"),
      "状态": tx.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "交易");
    XLSX.writeFile(workbook, `circle-tracker-${format(new Date(), "yyyy-MM-dd-HHmmss")}.xlsx`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Circle 链上行为追踪器</h1>
            <p className="text-slate-600 mt-2">实时监控 USDC Mint/Burn 和 CCTP 跨链结算</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              刷新
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={transactions.length === 0}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              导出 Excel
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">总交易数</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">{summaryStats.totalTransactions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">总 Mint 金额</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">${summaryStats.totalMint.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">总 Burn 金额</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">${summaryStats.totalBurn.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">CCTP 转账金额</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">${summaryStats.totalCCTPTransfers.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>过滤器</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">链</label>
                <Select value={filters.chainId || ""} onValueChange={(value) => {
                  setFilters({ ...filters, chainId: value || undefined });
                  setPage(0);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="所有链" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">所有链</SelectItem>
                    {CHAIN_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">交易类型</label>
                <Select value={filters.type || ""} onValueChange={(value) => {
                  setFilters({ ...filters, type: value || undefined });
                  setPage(0);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="所有类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">所有类型</SelectItem>
                    {TRANSACTION_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">搜索交易哈希</label>
                <Input
                  placeholder="0x..."
                  value={filters.searchHash || ""}
                  onChange={(e) => setFilters({ ...filters, searchHash: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ chainId: undefined, type: undefined, searchHash: undefined });
                    setPage(0);
                  }}
                  className="w-full"
                >
                  重置过滤器
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>交易列表</CardTitle>
            <CardDescription>显示 {transactions.length} 条交易记录</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>交易哈希</TableHead>
                    <TableHead>链</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead className="text-right">金额 (USDC)</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        暂无交易记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">
                          <a
                            href={`https://etherscan.io/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                          </a>
                        </TableCell>
                        <TableCell>{getChainName(tx.chainId)}</TableCell>
                        <TableCell>
                          <Badge className={getTransactionTypeColor(tx.type)}>
                            {TRANSACTION_TYPES[tx.type as keyof typeof TRANSACTION_TYPES]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {parseFloat(tx.amount.toString()).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(tx.timestamp), "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === "CONFIRMED" ? "default" : "secondary"}>
                            {tx.status === "CONFIRMED" ? "已确认" : tx.status === "PENDING" ? "待确认" : "失败"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-slate-600">
                第 {page + 1} 页 (每页 {pageSize} 条)
              </div>
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
                  disabled={transactions.length < pageSize}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
