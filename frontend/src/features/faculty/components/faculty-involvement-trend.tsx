import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FacultyInvolvementTrend } from "@/types/user";

interface FacultyInvolvementTrendProps {
	data: FacultyInvolvementTrend[];
	months: 6 | 12 | 24;
	onMonthsChange: (months: 6 | 12 | 24) => void;
}

const chartConfig = {
	leadInvolvements: {
		label: "Project Leader",
		color: "var(--chart-1)",
	},
	collaboratorInvolvements: {
		label: "Collaborator",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

function formatMonth(month: string) {
	const [year, monthNumber] = month.split("-").map(Number);
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		timeZone: "UTC",
	}).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function FacultyInvolvementTrendChart({
	data,
	months,
	onMonthsChange,
}: FacultyInvolvementTrendProps) {
	const hasData = data.some(
		(point) => point.leadInvolvements + point.collaboratorInvolvements > 0,
	);

	return (
		<div className="rounded-xl border border-border bg-card p-4 shadow-[0_1px_2px_0_var(--shadow-card)] sm:p-6">
			<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex flex-col gap-1">
					<h2 className="text-sm font-semibold text-heading">
						Current Project Involvement by Approval Month
					</h2>
					<p className="text-sm text-muted-foreground">
						Current active assignments grouped by when projects entered the
						approved portfolio · last {months} months
					</p>
				</div>
				<Select
					value={String(months)}
					onValueChange={(value) => {
						if (value === "6" || value === "12" || value === "24") {
							onMonthsChange(Number(value) as 6 | 12 | 24);
						}
					}}
				>
					<SelectTrigger className="h-9 w-full sm:w-[150px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="6">Last 6 months</SelectItem>
						<SelectItem value="12">Last 12 months</SelectItem>
						<SelectItem value="24">Last 24 months</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{hasData ? (
				<ChartContainer config={chartConfig} className="min-h-[280px] w-full">
					<BarChart
						accessibilityLayer
						data={data}
						margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
					>
						<CartesianGrid vertical={false} />
						<XAxis
							dataKey="month"
							axisLine={false}
							tickLine={false}
							tickMargin={8}
							minTickGap={24}
							tickFormatter={formatMonth}
						/>
						<YAxis
							allowDecimals={false}
							axisLine={false}
							tickLine={false}
							tickMargin={8}
						/>
						<ChartTooltip
							cursor={false}
							content={
								<ChartTooltipContent
									indicator="line"
									labelFormatter={(_label, payload) =>
										payload[0]?.payload?.month
											? formatMonth(payload[0].payload.month)
											: ""
									}
								/>
							}
						/>
						<ChartLegend content={<ChartLegendContent />} />
						<Bar
							dataKey="leadInvolvements"
							stackId="involvement"
							fill="var(--color-leadInvolvements)"
							radius={[0, 0, 4, 4]}
						/>
						<Bar
							dataKey="collaboratorInvolvements"
							stackId="involvement"
							fill="var(--color-collaboratorInvolvements)"
							radius={[4, 4, 0, 0]}
						/>
					</BarChart>
				</ChartContainer>
			) : (
				<div className="flex min-h-[280px] items-center justify-center text-center text-sm text-muted-foreground">
					No current project involvement was approved in this period.
				</div>
			)}
		</div>
	);
}
