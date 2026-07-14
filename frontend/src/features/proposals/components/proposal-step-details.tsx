import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Field,
	FieldContent,
	FieldError,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { FormValues } from "./proposal-form";
import { toStableDate } from "@/lib/utils";

function formatPeso(value: number): string {
	if (!value && value !== 0) return "";
	return value.toLocaleString("en-PH", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 2,
	});
}

function parsePesoInput(raw: string): number {
	const cleaned = raw.replace(/[^0-9.]/g, "");
	const parsed = parseFloat(cleaned);
	return Number.isNaN(parsed) ? 0 : parsed;
}

interface CurrencyInputProps {
	value: number;
	onChange: (value: number) => void;
	placeholder?: string;
}

function CurrencyInput({ value, onChange, placeholder }: CurrencyInputProps) {
	const [display, setDisplay] = React.useState(() => formatPeso(value));

	React.useEffect(() => {
		setDisplay(formatPeso(value));
	}, [value]);

	return (
		<div className="relative">
			<span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
				₱
			</span>
			<Input
				type="text"
				inputMode="decimal"
				className="pl-7"
				value={display}
				placeholder={placeholder}
				onChange={(e) => {
					const raw = e.target.value;
					const num = parsePesoInput(raw);
					setDisplay(raw === "" ? "" : formatPeso(num));
					onChange(num);
				}}
				onBlur={() => setDisplay(formatPeso(value))}
			/>
		</div>
	);
}

interface ProposalStepDetailsProps {
	form: UseFormReturn<FormValues>;
}

export function ProposalStepDetails({ form }: ProposalStepDetailsProps) {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4">
				<Field>
					<FieldLabel>Target Start Date</FieldLabel>
					<FieldContent>
						<Controller
							control={form.control}
							name="targetStartDate"
							render={({ field }) => (
								<Popover>
									<PopoverTrigger
										render={
											<Button
												type="button"
												variant="outline"
												className="w-full justify-start text-left font-normal"
											/>
										}
									>
										<CalendarIcon className="mr-2 size-4 text-muted-foreground" />
										{field.value ? (
											format(toStableDate(field.value), "PPP")
										) : (
											<span className="text-muted-foreground">
												Pick a start date
											</span>
										)}
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value ? toStableDate(field.value) : undefined}
											onSelect={(date) =>
												field.onChange(date ? format(date, "yyyy-MM-dd") : "")
											}
										/>
									</PopoverContent>
								</Popover>
							)}
						/>
					</FieldContent>
					<FieldError errors={[form.formState.errors.targetStartDate]} />
				</Field>
				<Field>
					<FieldLabel>Target End Date</FieldLabel>
					<FieldContent>
						<Controller
							control={form.control}
							name="targetEndDate"
							render={({ field }) => (
								<Popover>
									<PopoverTrigger
										render={
											<Button
												type="button"
												variant="outline"
												className="w-full justify-start text-left font-normal"
											/>
										}
									>
										<CalendarIcon className="mr-2 size-4 text-muted-foreground" />
										{field.value ? (
											format(toStableDate(field.value), "PPP")
										) : (
											<span className="text-muted-foreground">
												Pick an end date
											</span>
										)}
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={field.value ? toStableDate(field.value) : undefined}
											onSelect={(date) =>
												field.onChange(date ? format(date, "yyyy-MM-dd") : "")
											}
										/>
									</PopoverContent>
								</Popover>
							)}
						/>
					</FieldContent>
					<FieldError errors={[form.formState.errors.targetEndDate]} />
				</Field>
			</div>
			<div className="grid grid-cols-2 gap-4">
				<Field>
					<FieldLabel>Budget (Partner)</FieldLabel>
					<FieldContent>
						<CurrencyInput
							value={form.watch("budgetPartner")}
							onChange={(val) => form.setValue("budgetPartner", val)}
							placeholder="0.00"
						/>
					</FieldContent>
					<FieldError errors={[form.formState.errors.budgetPartner]} />
				</Field>
				<Field>
					<FieldLabel>Budget (NEUST)</FieldLabel>
					<FieldContent>
						<CurrencyInput
							value={form.watch("budgetNeust")}
							onChange={(val) => form.setValue("budgetNeust", val)}
							placeholder="0.00"
						/>
					</FieldContent>
					<FieldError errors={[form.formState.errors.budgetNeust]} />
				</Field>
			</div>
		</div>
	);
}
