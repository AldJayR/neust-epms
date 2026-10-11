import type { UseFormReturn } from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuthUser } from "@/lib/auth";
import { BeneficiarySectorPicker } from "@/features/beneficiary-sectors/public";
import type { FormValues } from "./proposal-form";

interface ProposalStepInfoProps {
	form: UseFormReturn<FormValues>;
	user: AuthUser;
	sdgsData?: Array<{ sdgId: number; sdgNumber: number; sdgName: string }>;
	extensionServicesData?: Array<{
		extensionServiceId: number;
		serviceName: string;
	}>;
	bannerProgramsData?: Array<{
		bannerProgramId: number;
		programName: string;
	}>;
}

export function ProposalStepInfo({
	form,
	user,
	sdgsData,
	extensionServicesData,
	bannerProgramsData,
}: ProposalStepInfoProps) {
	const watchedSdgIds =
		useWatch({
			control: form.control,
			name: "sdgIds",
		}) || [];

	const watchedExtensionServiceIds =
		useWatch({
			control: form.control,
			name: "extensionServiceIds",
		}) || [];

	const watchedSdgIdSet = new Set(watchedSdgIds);
	const watchedExtensionServiceIdSet = new Set(watchedExtensionServiceIds);

	const bannerProgramLabels = Object.fromEntries(
		(bannerProgramsData ?? []).map((p) => [
			String(p.bannerProgramId),
			p.programName,
		]),
	) as Record<string, string>;

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

			<div className="min-w-0">
				<Field>
					<FieldLabel>Banner Program</FieldLabel>
					<FieldContent>
						<Select
							value={
								form.watch("bannerProgramId") > 0
									? String(form.watch("bannerProgramId"))
									: ""
							}
							onValueChange={(value) =>
								form.setValue("bannerProgramId", Number(value), {
									shouldDirty: true,
									shouldValidate: true,
								})
							}
							disabled={!bannerProgramsData || bannerProgramsData.length === 0}
						>
							<SelectTrigger className="w-full min-w-0">
								<SelectValue
									className="min-w-0 overflow-hidden"
									placeholder={
										!bannerProgramsData
											? "Loading programs..."
											: bannerProgramsData.length === 0
												? "No programs configured"
												: "Select a banner program"
									}
								>
									{(value) => (
										<span
											className="block min-w-0 truncate"
											title={value ? bannerProgramLabels[value] : undefined}
										>
											{value
												? (bannerProgramLabels[value] ?? value)
												: !bannerProgramsData
													? "Loading programs..."
													: bannerProgramsData.length === 0
														? "No programs configured"
														: "Select a banner program"}
										</span>
									)}
								</SelectValue>
							</SelectTrigger>
							<SelectContent
								align="start"
								alignItemWithTrigger={false}
								className="w-(--anchor-width) min-w-0 max-w-(--available-width)"
							>
								{bannerProgramsData?.map((program) => (
									<SelectItem
										key={program.bannerProgramId}
										value={String(program.bannerProgramId)}
										className="[&>span]:min-w-0 [&>span]:shrink [&>span]:whitespace-normal [&>span]:break-words"
									>
										{program.programName}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{bannerProgramsData?.length === 0 && (
							<p className="text-xs text-muted-foreground">
								A RET Chair must configure a banner program before proposals can
								be submitted.
							</p>
						)}
					</FieldContent>
					<FieldError errors={[form.formState.errors.bannerProgramId]} />
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
									<Label
										htmlFor={`extension-service-${service.extensionServiceId}`}
										className="cursor-pointer select-none text-sm font-normal"
									>
										{service.serviceName}
									</Label>
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
							<Label
								htmlFor={`sdg-${sdg.sdgId}`}
								className="text-xs font-normal text-slate-600 cursor-pointer select-none dark:text-muted-foreground"
							>
								SDG {sdg.sdgNumber} · {sdg.sdgName}
							</Label>
						</div>
					))}
				</div>
				<FieldError errors={[form.formState.errors.sdgIds]} />
			</div>

			<div className="md:col-span-2 space-y-2">
				<FieldLabel htmlFor="beneficiary-sectors">
					Target Beneficiary Sectors
				</FieldLabel>
				<Controller
					control={form.control}
					name="beneficiarySectors"
					render={({ field, fieldState }) => (
						<>
							<BeneficiarySectorPicker
								id="beneficiary-sectors"
								inputRef={field.ref}
								value={field.value}
								onChange={field.onChange}
								onBlur={field.onBlur}
								invalid={fieldState.invalid}
							/>
							<FieldError errors={[fieldState.error]} />
						</>
					)}
				/>
			</div>
		</div>
	);
}
