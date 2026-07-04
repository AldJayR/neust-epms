import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/custom/loading-button";
import { PageHeader } from "@/components/custom/page-header";
import { PageCard } from "@/components/custom/page-card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settingsQueryOptions, updateSettingFn } from "@/lib/settings.functions";

export function SettingsPage() {
	const queryClient = useQueryClient();
	const { data: settings } = useQuery(settingsQueryOptions());
	const [retentionYears, setRetentionYears] = useState("10");

	useEffect(() => {
		if (settings?.project_retention_years)
			setRetentionYears(settings.project_retention_years);
	}, [settings]);

	const saveMutation = useMutation({
		mutationFn: () =>
			updateSettingFn({
				data: {
					settingKey: "project_retention_years",
					settingValue: retentionYears,
				},
			}),
		onSuccess: () => {
			toast.success("Setting saved");
			queryClient.invalidateQueries({ queryKey: ["settings"] });
		},
		onError: (err) => toast.error(err.message),
	});

	return (
		<div className="flex flex-col gap-8">
			<PageHeader
				title={
					<h1 className="text-2xl font-semibold text-heading">Settings</h1>
				}
			/>

			<PageCard className="p-6">
				<h2 className="text-lg font-semibold text-heading mb-4">
					Data Retention
				</h2>
				<div className="space-y-4">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="retention-years">
							Project retention period (years)
						</Label>
						<Input
							id="retention-years"
							type="number"
							min={1}
							max={100}
							value={retentionYears}
							onChange={(e) => setRetentionYears(e.target.value)}
							className="w-32"
						/>
						<p className="text-xs text-muted-foreground">
							Closed projects are archived after this period. Used by the archival
							cron.
						</p>
					</div>
					<LoadingButton
						onClick={() => saveMutation.mutate()}
						loading={saveMutation.isPending}
					>
						Save
					</LoadingButton>
				</div>
			</PageCard>

			<PageCard className="p-6">
				<h2 className="text-lg font-semibold text-heading mb-4">
					System Information
				</h2>
				<div className="space-y-4">
					<InfoRow label="Application Name" value={settings?.app_name ?? "—"} />
					<InfoRow label="Version" value="1.0.0" />
					<InfoRow
						label="Admin Contact"
						value={settings?.admin_email ?? "—"}
					/>
					<InfoRow
						label="Email Service"
						value={settings?.resend_api_key ? "Configured" : "Not configured"}
					/>
				</div>
			</PageCard>
		</div>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-baseline gap-4">
			<span className="w-36 text-sm text-muted-foreground shrink-0">
				{label}
			</span>
			<span className="text-sm text-foreground">{value}</span>
		</div>
	);
}
