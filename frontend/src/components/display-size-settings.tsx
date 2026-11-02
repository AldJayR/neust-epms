import { useId } from "react";
import { DISPLAY_SIZE_OPTIONS, getDisplaySizeOption } from "@/lib/display-size";
import { useDisplaySize } from "./display-size-provider";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

export function DisplaySizeSettings() {
	const id = useId();
	const { displaySize, setDisplaySize, storageAvailable } = useDisplaySize();
	const selected = getDisplaySizeOption(displaySize);
	return (
		<section
			className="space-y-4 border-t border-border pt-6"
			aria-labelledby={`${id}-heading`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="space-y-1">
					<h3 id={`${id}-heading`} className="text-sm font-semibold">
						Text &amp; Display Size
					</h3>
					<p
						id={`${id}-help`}
						className="max-w-md text-sm text-muted-foreground"
					>
						Increase text and control sizes across EPMS. PDF document zoom is
						managed separately.
					</p>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					disabled={displaySize === "default"}
					onClick={() => setDisplaySize("default")}
				>
					Reset to default
				</Button>
			</div>
			<RadioGroup
				value={displaySize}
				onValueChange={(value) =>
					setDisplaySize(getDisplaySizeOption(value).value)
				}
				aria-labelledby={`${id}-heading`}
				aria-describedby={`${id}-help`}
				className="gap-2 lg:grid-cols-3"
			>
				{DISPLAY_SIZE_OPTIONS.map((option) => (
					<div
						key={option.value}
						className={`flex items-center gap-3 rounded-lg border p-3 ${displaySize === option.value ? "border-primary bg-primary/5" : "border-border"}`}
					>
						<RadioGroupItem
							id={`${id}-${option.value}`}
							value={option.value}
							nativeButton
							render={<button type="button" />}
						/>
						<Label
							htmlFor={`${id}-${option.value}`}
							className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1 leading-normal"
						>
							<span>{option.label}</span>
							<span className="text-xs font-normal text-muted-foreground">
								{option.percent}%
							</span>
						</Label>
					</div>
				))}
			</RadioGroup>
			<section
				className="space-y-2 rounded-lg border border-border bg-muted/30 p-4"
				aria-labelledby={`${id}-preview`}
			>
				<h4
					id={`${id}-preview`}
					className="text-xs font-medium text-muted-foreground"
				>
					Live preview
				</h4>
				<p className="text-base font-semibold">Extension project overview</p>
				<p className="text-sm">
					Review proposals, monitor project progress, and view faculty
					involvement.
				</p>
			</section>
			<p role="status" className="text-xs text-muted-foreground">
				{selected.label} ({selected.percent}%) selected.{" "}
				{storageAvailable
					? "Saved in this browser."
					: "Applied to this tab. Browser storage is unavailable, so this choice cannot be saved."}
			</p>
		</section>
	);
}
