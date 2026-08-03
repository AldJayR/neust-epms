import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";

interface ProjectsChartProps {
	chartData: { label: string; value: number }[];
}

const chartConfig = {
	value: {
		label: "Approved projects",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

export default function ProjectsChart({ chartData }: ProjectsChartProps) {
	return (
		<ChartContainer
			config={chartConfig}
			className="h-full min-h-[240px] w-full"
		>
			<AreaChart
				accessibilityLayer
				data={chartData}
				margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
			>
				<defs>
					<linearGradient id="approvalFill" x1="0" y1="0" x2="0" y2="1">
						<stop
							offset="5%"
							stopColor="var(--color-value)"
							stopOpacity={0.35}
						/>
						<stop
							offset="95%"
							stopColor="var(--color-value)"
							stopOpacity={0.03}
						/>
					</linearGradient>
				</defs>
				<CartesianGrid vertical={false} />
				<XAxis
					dataKey="label"
					axisLine={false}
					tickLine={false}
					tickMargin={8}
					minTickGap={24}
				/>
				<YAxis
					allowDecimals={false}
					axisLine={false}
					tickLine={false}
					tickMargin={8}
				/>
				<ChartTooltip
					cursor={false}
					content={<ChartTooltipContent indicator="line" />}
				/>
				<Area
					type="monotone"
					dataKey="value"
					stroke="var(--color-value)"
					strokeWidth={2}
					fill="url(#approvalFill)"
					fillOpacity={1}
					activeDot={{ r: 4 }}
				/>
			</AreaChart>
		</ChartContainer>
	);
}
