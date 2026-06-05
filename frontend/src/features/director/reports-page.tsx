
import { useQuery } from "@tanstack/react-query";
import { 
  Search, 
  SlidersHorizontal, 
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppShell } from "../layout/app-shell";
import { reportsQueryOptions } from "@/lib/director.functions";

export function ReportsPage() {
  const { data, isLoading, error } = useQuery(reportsQueryOptions());

  const reports = data?.items ?? [];
  const totalReports = data?.total ?? 0;
  const progressCount = reports.filter((r) => r.reportType === "Progress").length;
  const terminalCount = reports.filter((r) => r.reportType === "Terminal").length;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-[#11215a]">Reports</h1>
          <Button className="bg-[#1e3b8a] text-white hover:bg-[#1e3b8a]/90 rounded-[10px] gap-2">
            <Plus className="size-4" />
            Export Reports
          </Button>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-[#ebebeb] shadow-sm rounded-[12px]">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-normal text-[#666]">Total Reports</p>
              <p className="text-4xl font-semibold text-[#11215a]">{totalReports}</p>
            </CardContent>
          </Card>
          <Card className="border-[#ebebeb] shadow-sm rounded-[12px]">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-normal text-[#666]">Progress Reports</p>
              <p className="text-4xl font-semibold text-[#11215a]">{progressCount}</p>
            </CardContent>
          </Card>
          <Card className="border-[#ebebeb] shadow-sm rounded-[12px]">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-normal text-[#666]">Terminal Reports</p>
              <p className="text-4xl font-semibold text-[#11215a]">{terminalCount}</p>
            </CardContent>
          </Card>
          <Card className="border-[#ebebeb] shadow-sm rounded-[12px]">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-normal text-[#666]">Report Types</p>
              <p className="text-4xl font-semibold text-[#11215a]">
                {new Set(reports.map((r) => r.reportType)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-[352px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search reports" 
              className="pl-9 h-9 border-[#e5e5e5] rounded-[8px]" 
            />
          </div>
          <Button variant="outline" className="h-9 w-9 p-0 border-[#e5e5e5] rounded-[8px] shadow-sm">
            <SlidersHorizontal className="size-4" />
          </Button>
        </div>

        {/* Data Table */}
        <Card className="border-[#ebebeb] shadow-sm rounded-[12px] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#fcfcfc]">
              <TableRow className="border-b border-[#ebebeb] hover:bg-transparent">
                <TableHead className="text-[#666] font-medium h-10 px-4">Report ID</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Project ID</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Report Type</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Remarks</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Submitted</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#666]">
                    Loading reports...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#ce2c31]">
                    Failed to load reports
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-[#666]">
                    No reports found
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.reportId} className="border-b border-[#ebebeb] hover:bg-gray-50">
                    <TableCell className="px-4 py-3 font-semibold text-[#0a0a0a] max-w-[200px]">
                      {report.reportId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[#0a0a0a] text-center">
                      {report.projectId.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center">
                      <Badge 
                        variant="outline" 
                        className={`rounded-md font-medium text-[12px] px-2 py-0.5 border ${
                          report.reportType === "Terminal" 
                            ? "bg-[#ffee9c] text-[#ab6400] border-[#e2a336]" 
                            : "bg-[#c4e8d1] text-[#218358] border-[#2b9a66]"
                        }`}
                      >
                        {report.reportType}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[#0a0a0a] text-center max-w-[200px] truncate">
                      {report.remarks ?? "—"}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-[#0a0a0a] text-center">
                      {formatDate(report.submittedAt)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" className="h-8 w-8 p-0" />
                          }
                        >
                          <MoreVertical className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Download Report</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[#666]">
            Showing <span className="font-bold">{reports.length}</span> of <span className="font-bold">{totalReports}</span> results
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1 font-medium text-sm">
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-[#e5e5e5] shadow-sm font-medium">1</Button>
            <Button variant="ghost" size="sm" className="gap-1 font-medium text-sm">
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
