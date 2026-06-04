
import { 
  Download, 
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

interface Report {
  id: string;
  project: string;
  leader: string;
  department: string;
  reportType: "Terminal" | "Progress";
  submitted: string;
  status: "Closure" | "Overdue" | "Received";
}

const mockReports: Report[] = [
  {
    id: "1",
    project: "Tech Literacy for Seniors",
    leader: "Rosa Santos",
    department: "College of Information and Communications Technology",
    reportType: "Terminal",
    submitted: "Dec 10, 2024",
    status: "Closure",
  },
  {
    id: "2",
    project: "Mobile Health Clinic",
    leader: "Jose Cruz",
    department: "College of Management and Business Technology",
    reportType: "Terminal",
    submitted: "Dec 5, 2024",
    status: "Closure",
  },
  {
    id: "3",
    project: "Livelihood Training",
    leader: "J. dela Cruz",
    department: "College of Education",
    reportType: "Progress",
    submitted: "Apr 5, 2024",
    status: "Overdue",
  },
  {
    id: "4",
    project: "Community Health Outreach",
    leader: "Ana Lim",
    department: "College of Agriculture",
    reportType: "Progress",
    submitted: "Apr 15, 2025",
    status: "Received",
  },
  {
    id: "5",
    project: "Environmental Awareness Drive",
    leader: "C. Reyes",
    department: "College of Nursing",
    reportType: "Progress",
    submitted: "Mar 18, 2025",
    status: "Received",
  },
];

export function ReportsPage() {
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
              <p className="text-4xl font-semibold text-[#11215a]">42</p>
            </CardContent>
          </Card>
          <Card className="border-[#ebebeb] shadow-sm rounded-[12px]">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-normal text-[#666]">Progress Reports</p>
              <p className="text-4xl font-semibold text-[#11215a]">08</p>
            </CardContent>
          </Card>
          <Card className="border-[#ebebeb] shadow-sm rounded-[12px]">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-normal text-[#666]">Overdue</p>
              <p className="text-4xl font-semibold text-[#11215a]">127</p>
            </CardContent>
          </Card>
          <Card className="border-[#ebebeb] shadow-sm rounded-[12px]">
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-normal text-[#666]">Pending Closure Review</p>
              <p className="text-4xl font-semibold text-[#11215a]">127</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-[352px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Search projects" 
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
                <TableHead className="text-[#666] font-medium h-10 px-4">Project</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Leader</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Department</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Report Type</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Submitted</TableHead>
                <TableHead className="text-[#666] font-medium h-10 px-4 text-center">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white">
              {mockReports.map((report) => (
                <TableRow key={report.id} className="border-b border-[#ebebeb] hover:bg-gray-50">
                  <TableCell className="px-4 py-3 font-semibold text-[#0a0a0a] max-w-[200px]">
                    {report.project}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#0a0a0a] text-center">
                    {report.leader}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[#0a0a0a] text-center max-w-[250px]">
                    {report.department}
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
                  <TableCell className="px-4 py-3 text-[#0a0a0a] text-center">
                    {report.submitted}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <Badge 
                      variant="outline" 
                      className={`rounded-md font-medium text-[12px] px-2 py-0.5 border ${
                        report.status === "Closure" 
                          ? "bg-[#ead5f9] text-[#8145b5] border-[#8e4ec6]" 
                          : report.status === "Overdue"
                          ? "bg-[#ffcdce] text-[#ce2c31] border-[#e5484d]"
                          : "bg-[#c4e8d1] text-[#218358] border-[#2b9a66]"
                      }`}
                    >
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem>Download Report</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-[#666]">
            Showing <span className="font-bold">5</span> of <span className="font-bold">42</span> results
          </p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="gap-1 font-medium text-sm">
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 border-[#e5e5e5] shadow-sm font-medium">1</Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 font-medium">2</Button>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 font-medium">3</Button>
            <span className="px-2 text-muted-foreground">...</span>
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
