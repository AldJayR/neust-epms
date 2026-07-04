import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { BrandButton } from "@/components/custom/brand-button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	FileUpload,
	FileUploadDropzone,
	FileUploadItem,
	FileUploadItemDelete,
	FileUploadItemMetadata,
	FileUploadItemPreview,
	FileUploadList,
	FileUploadTrigger,
} from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FieldGroup } from "@/components/ui/field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { uploadMoaFn } from "@/lib/dashboard.functions";

interface CreateMoaModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function CreateMoaModal({ open, onOpenChange }: CreateMoaModalProps) {
	const queryClient = useQueryClient();
	const [partnerName, setPartnerName] = useState("");
	const [validFrom, setValidFrom] = useState<Date | undefined>(undefined);
	const [validUntil, setValidUntil] = useState<Date | undefined>(undefined);
	const [file, setFile] = useState<File | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!partnerName || !validFrom || !validUntil || !file) {
			toast.error("Please fill in all fields and select a file.");
			return;
		}

		if (validUntil <= validFrom) {
			toast.error("Expiration date must be after the signed from date.");
			return;
		}

		setIsSubmitting(true);
		try {
			const formData = new FormData();
			formData.append("partnerName", partnerName);
			formData.append("validFrom", validFrom.toISOString());
			formData.append("validUntil", validUntil.toISOString());
			formData.append("file", file);

			await uploadMoaFn({ data: formData });

			toast.success("MOA created successfully!");
			queryClient.invalidateQueries({ queryKey: ["director", "moas"] });
			onOpenChange(false);
			// Reset state
			setPartnerName("");
			setValidFrom(undefined);
			setValidUntil(undefined);
			setFile(null);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Failed to create MOA");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[480px]">
				<DialogHeader>
					<DialogTitle>Create MOA</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-5 py-4">
					<FieldGroup className="flex flex-col gap-1.5">
						<Label htmlFor="partnerName">Partner Organization</Label>
						<Input
							id="partnerName"
							type="text"
							placeholder="Enter partner name"
							value={partnerName}
							onChange={(e) => setPartnerName(e.target.value)}
							required
						/>
					</FieldGroup>

					<div className="grid grid-cols-2 gap-4">
						<FieldGroup className="flex flex-col gap-1.5">
							<Label htmlFor="validFrom">Signed From</Label>
							<Popover>
								<PopoverTrigger
									render={
										<Button
											id="validFrom"
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
							<Label htmlFor="validUntil">Expiration Date</Label>
							<Popover>
								<PopoverTrigger
									render={
										<Button
											id="validUntil"
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

					<div className="flex flex-col gap-1.5">
						<Label>MOA Document</Label>
						<FileUpload
							value={file ? [file] : []}
							onValueChange={(files) => setFile(files[0] ?? null)}
							maxFiles={1}
							accept="application/pdf"
						>
							{!file && (
								<FileUploadDropzone className="border border-dashed border-zinc-300 rounded-lg p-6 bg-zinc-50 hover:bg-zinc-100/50 cursor-pointer">
									<div className="flex flex-col items-center gap-1 text-center">
										<Upload className="size-6 text-zinc-400 mb-1" />
										<p className="text-sm font-medium">
											Drag & drop PDF, or{" "}
											<FileUploadTrigger className="text-brand-primary hover:underline cursor-pointer">
												browse
											</FileUploadTrigger>
										</p>
										<p className="text-xs text-zinc-400">
											PDF only (max 50MB)
										</p>
									</div>
								</FileUploadDropzone>
							)}
							<FileUploadList className="mt-2">
								{file && (
									<FileUploadItem value={file}>
										<FileUploadItemPreview />
										<FileUploadItemMetadata />
										<FileUploadItemDelete />
									</FileUploadItem>
								)}
							</FileUploadList>
						</FileUpload>
					</div>

					<DialogFooter className="pt-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<BrandButton type="submit" disabled={isSubmitting} className="w-[120px]">
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								"Create MOA"
							)}
						</BrandButton>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
