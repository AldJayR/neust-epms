import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Progress, ProgressValue } from "@/components/ui/progress";

interface ProposalStepDocumentsProps {
	file: File | null;
	setFile: (file: File | null) => void;
	uploadPhase: "idle" | "creating" | "uploading" | "done";
	uploadProgress: number;
}

export function ProposalStepDocuments({
	file,
	setFile,
	uploadPhase,
	uploadProgress,
}: ProposalStepDocumentsProps) {
	return (
		<div className="space-y-6">
			{uploadPhase !== "idle" ? (
				<div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center gap-4 bg-card">
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
				</div>
			) : (
				<FileUpload
					value={file ? [file] : []}
					onValueChange={(files) => setFile(files[0] ?? null)}
					accept="application/pdf"
					maxFiles={1}
					maxSize={50 * 1024 * 1024}
					onFileReject={(_f, message) => {
						toast.error(message);
					}}
				>
					{!file && (
						<FileUploadDropzone className="border-2 border-dashed border-border rounded-xl p-8 bg-card hover:bg-primary/5">
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
							<FileUploadTrigger
								render={
									<Button
										variant="secondary"
										className="bg-brand-primary hover:bg-brand-primary-hover text-white"
									/>
								}
							>
								Select File
							</FileUploadTrigger>
						</FileUploadDropzone>
					)}

					<FileUploadList>
						{file && (
							<FileUploadItem value={file}>
								<FileUploadItemPreview className="size-10" />
								<FileUploadItemMetadata />
								<FileUploadItemDelete
									render={
										<Button
											variant="ghost"
											size="icon"
											className="size-8 text-muted-foreground hover:text-destructive"
										/>
									}
								>
									✕
								</FileUploadItemDelete>
							</FileUploadItem>
						)}
					</FileUploadList>
				</FileUpload>
			)}
		</div>
	);
}
