import { FileText, Loader2, Upload } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress, ProgressValue } from "@/components/ui/progress";

interface ProposalStepDocumentsProps {
	file: File | null;
	setFile: (file: File | null) => void;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	isDragging: boolean;
	setIsDragging: (dragging: boolean) => void;
	uploadPhase: "idle" | "creating" | "uploading" | "done";
	uploadProgress: number;
}

function validateAndSetFile(
	selectedFile: File,
	setFile: (file: File | null) => void,
) {
	if (selectedFile.type !== "application/pdf") {
		toast.error("Only PDF files are allowed");
		return;
	}
	if (selectedFile.size > 50 * 1024 * 1024) {
		toast.error("File size must be less than 50MB");
		return;
	}
	setFile(selectedFile);
}

export function ProposalStepDocuments({
	file,
	setFile,
	fileInputRef,
	isDragging,
	setIsDragging,
	uploadPhase,
	uploadProgress,
}: ProposalStepDocumentsProps) {
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files?.[0]) {
			validateAndSetFile(e.target.files[0], setFile);
			e.target.value = "";
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) validateAndSetFile(droppedFile, setFile);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const removeFile = () => {
		setFile(null);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	return (
		<div className="space-y-6">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: drag and drop zone */}
			<div
				className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-[#fcfcfc] transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-[#e5e5e5]"}`}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
			>
				{uploadPhase !== "idle" ? (
					<div className="flex flex-col items-center gap-3 w-full max-w-xs">
						<div className="p-3 bg-primary/10 rounded-full">
							<Loader2 className="size-8 text-primary animate-spin" />
						</div>
						<p className="text-sm font-medium">
							{uploadPhase === "creating" && "Creating proposal..."}
							{uploadPhase === "uploading" && "Uploading document..."}
							{uploadPhase === "done" && "Upload complete!"}
						</p>
						<Progress value={uploadProgress} className="w-full">
							<ProgressValue />
						</Progress>
					</div>
				) : file ? (
					<div className="flex flex-col items-center gap-2">
						<div className="p-3 bg-primary/10 rounded-full">
							<FileText className="size-8 text-primary" />
						</div>
						<p className="text-sm font-medium">{file.name}</p>
						<p className="text-xs text-muted-foreground">
							{(file.size / 1024 / 1024).toFixed(2)} MB
						</p>
						<div className="flex gap-2 mt-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									fileInputRef.current?.click();
								}}
							>
								Change File
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="text-destructive hover:text-destructive"
								onClick={removeFile}
							>
								Remove
							</Button>
						</div>
					</div>
				) : (
					<>
						<div className="p-4 bg-primary/10 rounded-full">
							<Upload className="size-8 text-primary" />
						</div>
						<div className="text-center">
							<p className="text-sm font-medium">
								Click to upload or drag and drop
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Project Proposal PDF (Max 50MB)
							</p>
						</div>
						<input
							type="file"
							id="file-upload"
							ref={fileInputRef}
							className="hidden"
							aria-label="Upload Project Proposal PDF"
							accept="application/pdf"
							onChange={handleFileChange}
						/>
						<Button
							variant="secondary"
							className="bg-brand-primary hover:bg-brand-primary-hover text-white"
							render={
								/* biome-ignore lint/a11y/noLabelWithoutControl: label is used to render button wrapper */
								<label
									htmlFor="file-upload"
									className="cursor-pointer"
								>
									Select File
								</label>
							}
							nativeButton={false}
						/>
					</>
				)}
			</div>
		</div>
	);
}
