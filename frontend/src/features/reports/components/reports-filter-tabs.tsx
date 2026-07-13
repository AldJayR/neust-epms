import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ReportsFilterTabs({
	value,
	onValueChange,
}: {
	value: "my" | "college";
	onValueChange: (value: "my" | "college") => void;
}) {
	return (
		<div className="border-b border-border bg-background p-2">
			<Tabs
				value={value}
				onValueChange={(nextValue) =>
					onValueChange(nextValue as "my" | "college")
				}
				className="w-fit"
			>
				<TabsList className="bg-muted">
					<TabsTrigger
						value="my"
						className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
					>
						My Reports
					</TabsTrigger>
					<TabsTrigger
						value="college"
						className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
					>
						College-wide Reports
					</TabsTrigger>
				</TabsList>
			</Tabs>
		</div>
	);
}
