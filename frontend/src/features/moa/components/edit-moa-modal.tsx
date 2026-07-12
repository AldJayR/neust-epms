import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BrandButton } from "@/components/custom/brand-button";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { updateMoaFn } from "../functions";

interface EditMoaModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	moaId: string;
	partnerName: string;
	validFrom: string;
	validUntil: string;
}

export function EditMoaModal({
	open,
	onOpenChange,
	moaId,
	partnerName: initialPartnerName,
	validFrom: initialValidFrom,
	validUntil: initialValidUntil,
}: EditMoaModalProps) {
	const queryClient = useQueryClient();
	const [partnerName] = useState(initialPartnerName);
	const [validFrom, setValidFrom] = useState<Date | undefined>(
		initialValidFrom ? new Date(initialValidFrom) : undefined,
	);
	const [validUntil, setValidUntil] = useState<Date | undefined>(
		initialValidUntil ? new Date(initialValidUntil) : undefined,
	);
	const updateMutation = useMutation({
		mutationFn: (dates: { validFrom: Date; validUntil: Date }) =>
			updateMoaFn({
				data: {
					moaId,
					validFrom: dates.validFrom.toISOString(),
					validUntil: dates.validUntil.toISOString(),
				},
			}),
		onSuccess: () => {
			toast.success("MOA updated successfully.");
			queryClient.invalidateQueries({ queryKey: ["moas", moaId] });
			onOpenChange(false);
		},
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Failed to update MOA");
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!validFrom || !validUntil) {
			toast.error("Please fill in all fields.");
			return;
		}
		if (validUntil <= validFrom) {
			toast.error("Expiration date must be after the signed from date.");
			return;
		}
		updateMutation.mutate({ validFrom, validUntil });
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Edit MOA</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-5 py-4">
					<FieldGroup className="flex flex-col gap-1.5">
						<Label htmlFor="edit-partnerName">Partner Organization</Label>
						<Input
							id="edit-partnerName"
							type="text"
							value={partnerName}
							disabled
							className="opacity-60"
						/>
					</FieldGroup>

					<div className="grid grid-cols-2 gap-4">
						<FieldGroup className="flex flex-col gap-1.5">
							<Label htmlFor="edit-validFrom">Date Signed</Label>
							<Popover>
								<PopoverTrigger
									render={
										<Button
											id="edit-validFrom"
											type="button"
											variant="outline"
											className="w-full justify-start text-left font-normal"
										/>
									}
								>
									<CalendarIcon className="mr-2 size-4 text-muted-foreground" />
									{validFrom ? (
										format(validFrom, "PPP")
									) : (
										<span className="text-muted-foreground">Pick a date</span>
									)}
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={validFrom}
										onSelect={setValidFrom}
									/>
								</PopoverContent>
							</Popover>
						</FieldGroup>

						<FieldGroup className="flex flex-col gap-1.5">
							<Label htmlFor="edit-validUntil">Expiry Date</Label>
							<Popover>
								<PopoverTrigger
									render={
										<Button
											id="edit-validUntil"
											type="button"
											variant="outline"
											className="w-full justify-start text-left font-normal"
										/>
									}
								>
									<CalendarIcon className="mr-2 size-4 text-muted-foreground" />
									{validUntil ? (
										format(validUntil, "PPP")
									) : (
										<span className="text-muted-foreground">Pick a date</span>
									)}
								</PopoverTrigger>
								<PopoverContent className="w-auto p-0" align="start">
									<Calendar
										mode="single"
										selected={validUntil}
										onSelect={setValidUntil}
									/>
								</PopoverContent>
							</Popover>
						</FieldGroup>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={updateMutation.isPending}
						>
							Cancel
						</Button>
						<BrandButton
							type="submit"
							disabled={updateMutation.isPending}
							className="w-[120px]"
						>
							{updateMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Saving...
								</>
							) : (
								"Save Changes"
							)}
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
