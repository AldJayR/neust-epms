import { X } from "lucide-react";
import * as React from "react";
import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { AuthUser } from "@/lib/auth";
import { appendBeneficiarySector } from "../helpers/proposal-wizard-helpers";
import type { FormValues } from "./proposal-form";

interface ProposalStepInfoProps {
	form: UseFormReturn<FormValues>;
	user: AuthUser;
	sdgsData?: Array<{ sdgId: number; sdgName: string }>;
	extensionServicesData?: Array<{
		extensionServiceId: number;
		serviceName: string;
	}>;
}

export function ProposalStepInfo({
	form,
	user,
	sdgsData,
	extensionServicesData,
}: ProposalStepInfoProps) {
	const watchedSdgIds =
		useWatch({
			control: form.control,
			name: "sdgIds",
		}) || [];

	const watchedSectors =
		useWatch({
			control: form.control,
			name: "beneficiarySectors",
		}) || [];

	const watchedExtensionServiceIds =
		useWatch({
			control: form.control,
			name: "extensionServiceIds",
		}) || [];

	const [sectorInput, setSectorInput] = React.useState("");

	const addSector = () => {
		form.setValue(
			"beneficiarySectors",
			appendBeneficiarySector(watchedSectors, sectorInput),
		);
		setSectorInput("");
	};

	const removeSector = (sector: string) => {
		form.setValue(
			"beneficiarySectors",
			watchedSectors.filter((s) => s !== sector),
		);
	};

	const watchedSdgIdSet = new Set(watchedSdgIds);
	const watchedExtensionServiceIdSet = new Set(watchedExtensionServiceIds);

	return (
		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
			<div className="md:col-span-2">
				<Field>
					<FieldLabel>Project Title</FieldLabel>
					<FieldContent>
						<Input
							placeholder="Enter project title"
							{...form.register("title")}
						/>
					</FieldContent>
					<FieldError errors={[form.formState.errors.title]} />
				</Field>
			</div>

			<div>
				<Field>
					<FieldLabel>Banner Program</FieldLabel>
					<FieldContent>
						<Input
							placeholder="e.g. Community Outreach"
							{...form.register("bannerProgram")}
						/>
					</FieldContent>
					<FieldError errors={[form.formState.errors.bannerProgram]} />
				</Field>
			</div>

			<div>
				<Field>
					<FieldLabel>Project Locale</FieldLabel>
					<FieldContent>
						<Input
							placeholder="e.g. Cabanatuan City"
							{...form.register("projectLocale")}
						/>
					</FieldContent>
					<FieldError errors={[form.formState.errors.projectLocale]} />
				</Field>
			</div>

			<div className="md:col-span-2">
				<Field>
					<FieldLabel>Extension Services Offered</FieldLabel>
					<FieldContent>
						<div className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-3">
							{extensionServicesData?.map((service) => (
								<div
									key={service.extensionServiceId}
									className="flex items-center gap-2 rounded p-1 hover:bg-muted/50"
								>
									<Checkbox
										id={`extension-service-${service.extensionServiceId}`}
										checked={watchedExtensionServiceIdSet.has(
											service.extensionServiceId,
										)}
										onCheckedChange={(checked) => {
											const current = form.getValues("extensionServiceIds");
											form.setValue(
												"extensionServiceIds",
												checked
													? [...current, service.extensionServiceId]
													: current.filter(
															(id) => id !== service.extensionServiceId,
														),
											);
										}}
									/>
									<label
										htmlFor={`extension-service-${service.extensionServiceId}`}
										className="cursor-pointer select-none text-sm font-normal"
									>
										{service.serviceName}
									</label>
								</div>
							))}
						</div>
					</FieldContent>
					<FieldError errors={[form.formState.errors.extensionServiceIds]} />
				</Field>
			</div>

			<div>
				<Field>
					<FieldLabel>Campus</FieldLabel>
					<FieldContent>
						<Input
							readOnly
							value={user.campusName}
							className="bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-muted dark:text-muted-foreground"
						/>
					</FieldContent>
				</Field>
			</div>

			<div className="md:col-span-2">
				<Field>
					<FieldLabel>Department</FieldLabel>
					<FieldContent>
						<Input
							readOnly
							value={user.departmentName ?? ""}
							className="bg-slate-50 text-slate-500 cursor-not-allowed dark:bg-muted dark:text-muted-foreground"
						/>
					</FieldContent>
				</Field>
			</div>

			<div className="md:col-span-2 space-y-2">
				<FieldLabel>Addressed SDGs</FieldLabel>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto p-2 border rounded-md">
					{sdgsData?.map((sdg) => (
						<div
							key={sdg.sdgId}
							className="flex flex-row items-center space-x-2.5 p-1 hover:bg-slate-50/50 rounded transition-colors dark:hover:bg-muted/50"
						>
							<Checkbox
								id={`sdg-${sdg.sdgId}`}
								checked={watchedSdgIdSet.has(sdg.sdgId)}
								onCheckedChange={(checked) => {
									const current = form.getValues("sdgIds") || [];
									if (checked) {
										form.setValue("sdgIds", [...current, sdg.sdgId]);
									} else {
										form.setValue(
											"sdgIds",
											current.filter((id) => id !== sdg.sdgId),
										);
									}
								}}
							/>
							<label
								htmlFor={`sdg-${sdg.sdgId}`}
								className="text-xs font-normal text-slate-600 cursor-pointer select-none dark:text-muted-foreground"
							>
								{sdg.sdgName}
							</label>
						</div>
					))}
				</div>
				<FieldError errors={[form.formState.errors.sdgIds]} />
			</div>

			<div className="md:col-span-2 space-y-2">
				<FieldLabel>Target Beneficiary Sectors</FieldLabel>
				<div className="flex flex-wrap gap-1.5 min-h-[38px] p-2 border rounded-md">
					{watchedSectors.map((sector) => (
						<Badge key={sector} variant="secondary" className="gap-1 pr-1">
							{sector}
							<button
								type="button"
								onClick={() => removeSector(sector)}
								aria-label={`Remove ${sector}`}
								className="rounded-full p-0.5 hover:bg-muted"
							>
								<X className="size-3" />
							</button>
						</Badge>
					))}
					<div className="flex min-w-[180px] flex-1 items-center gap-2">
						<Input
							placeholder={
								watchedSectors.length === 0 ? "Type a sector" : "Add more..."
							}
							value={sectorInput}
							onChange={(e) => setSectorInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									e.preventDefault();
									addSector();
								}
							}}
							className="min-w-0 flex-1 border-0 p-0 shadow-none focus-visible:ring-0"
						/>
						<Button
							type="button"
							size="xs"
							onClick={addSector}
							disabled={!sectorInput.trim()}
						>
							Add
						</Button>
					</div>
				</div>
				<p className="text-xs text-muted-foreground">
					Type a sector, then select Add. e.g. Farmers, Youth, Senior Citizens,
					Women, Children
				</p>
				<FieldError errors={[form.formState.errors.beneficiarySectors]} />
			</div>
		</div>
	);
}
