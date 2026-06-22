import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuthUser } from "@/lib/auth";
import type { FormValues } from "./create-proposal-modal";

interface ProposalStepInfoProps {
	form: UseFormReturn<FormValues>;
	user: AuthUser;
	sdgsData?: Array<{ sdgId: number; sdgName: string }>;
}

export function ProposalStepInfo({
	form,
	user,
	sdgsData,
}: ProposalStepInfoProps) {
	const watchedSdgIds =
		useWatch({
			control: form.control,
			name: "sdgIds",
		}) || [];

	return (
		<div className="space-y-4">
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
			<Field>
				<FieldLabel>Extension Category</FieldLabel>
				<FieldContent>
					<Select
						onValueChange={(val) => {
							if (val != null) form.setValue("extensionCategory", val);
						}}
						value={form.watch("extensionCategory")}
					>
						<SelectTrigger>
							<SelectValue placeholder="Select category" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="Category A">Category A</SelectItem>
							<SelectItem value="Category B">Category B</SelectItem>
							<SelectItem value="Category C">Category C</SelectItem>
						</SelectContent>
					</Select>
				</FieldContent>
				<FieldError errors={[form.formState.errors.extensionCategory]} />
			</Field>
			<Field>
				<FieldLabel>Campus</FieldLabel>
				<FieldContent>
					<Input readOnly value={user.campusName} className="bg-muted" />
				</FieldContent>
			</Field>
			<Field>
				<FieldLabel>Department</FieldLabel>
				<FieldContent>
					<Input
						readOnly
						value={user.departmentName ?? ""}
						className="bg-muted"
					/>
				</FieldContent>
			</Field>
			<div className="space-y-2">
				<FieldLabel>Addressed SDGs</FieldLabel>
				<div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
					{sdgsData?.map((sdg) => (
						<div
							key={sdg.sdgId}
							className="flex flex-row items-start space-x-3 space-y-0"
						>
							<Checkbox
								checked={watchedSdgIds.includes(sdg.sdgId)}
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
							<span className="font-normal text-xs">{sdg.sdgName}</span>
						</div>
					))}
				</div>
				<FieldError errors={[form.formState.errors.sdgIds]} />
			</div>
		</div>
	);
}
