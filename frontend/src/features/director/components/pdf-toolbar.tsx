"use client";

import {
	Hand,
	Maximize2,
	MessageSquare,
	Minimize2,
	Minus,
	Plus,
	RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

import { DEFAULT_SCALE, ZOOM_STEPS } from "./pdf-constants";

interface PdfToolbarProps {
	toolMode: "hand" | "comment";
	onToolModeChange: (mode: "hand" | "comment") => void;
	showCommentTools: boolean;
	isTheaterMode?: boolean;
	onToggleTheaterMode?: () => void;
	currentPage: number;
	numPages: number;
	scale: number;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onResetZoom: () => void;
}

export function PdfToolbar({
	toolMode,
	onToolModeChange,
	showCommentTools,
	isTheaterMode,
	onToggleTheaterMode,
	currentPage,
	numPages,
	scale,
	onZoomIn,
	onZoomOut,
	onResetZoom,
}: PdfToolbarProps) {
	return (
		<>
			{/* Floating Tool Mode Toolbar */}
			{showCommentTools && (
				<div className="absolute top-4 left-4 z-40 bg-background/95 border border-border px-2 py-1 rounded-full flex items-center gap-1 shadow-md backdrop-blur-md select-none">
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant={toolMode === "hand" ? "secondary" : "ghost"}
									size="icon"
									aria-label="Hand Tool (Pan and select text)"
									className={`size-8 rounded-full cursor-pointer ${toolMode === "hand" ? "bg-brand-primary/10 text-brand-primary" : "text-muted-foreground"}`}
									onClick={() => onToolModeChange("hand")}
								>
									<Hand className="size-4" />
								</Button>
							}
						/>
						<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
							View & Select Text
						</TooltipContent>
					</Tooltip>

					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant={toolMode === "comment" ? "secondary" : "ghost"}
									size="icon"
									aria-label="Comment Tool (Drag on page to add remark)"
									className={`size-8 rounded-full cursor-pointer ${toolMode === "comment" ? "bg-brand-primary/10 text-brand-primary" : "text-muted-foreground"}`}
									onClick={() => onToolModeChange("comment")}
								>
									<MessageSquare className="size-4" />
								</Button>
							}
						/>
						<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
							Add Remark (Drag on page)
						</TooltipContent>
					</Tooltip>

					{onToggleTheaterMode && (
						<>
							<div className="w-px h-4 bg-border mx-1" />
							<Tooltip>
								<TooltipTrigger
									render={
										<Button
											variant="ghost"
											size="icon"
											aria-label={
												isTheaterMode
													? "Exit Theater Mode"
													: "Enter Theater Mode"
											}
											className="size-8 rounded-full cursor-pointer text-muted-foreground hover:bg-gray-100"
											onClick={onToggleTheaterMode}
										>
											{isTheaterMode ? (
												<Minimize2 className="size-4" />
											) : (
												<Maximize2 className="size-4" />
											)}
										</Button>
									}
								/>
								<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
									{isTheaterMode
										? "Exit Theater Mode"
										: "Theater Mode (Maximize View)"}
								</TooltipContent>
							</Tooltip>
						</>
					)}
				</div>
			)}

			{/* Floating Page Indicator Pill */}
			<div className="absolute top-4 right-4 z-40 bg-zinc-900/80 text-white px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide backdrop-blur-md shadow-md border border-white/10 select-none">
				Page {currentPage} of {numPages || "–"}
			</div>

			{/* Bottom Zoom Controls */}
			<div className="flex items-center justify-center border-t border-border bg-background px-4 py-2 order-10">
				<div className="flex items-center gap-1.5">
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="outline"
									size="icon"
									aria-label="Zoom Out"
									className="size-8 rounded-[8px] border-border"
									onClick={onZoomOut}
									disabled={scale <= ZOOM_STEPS[0]}
								>
									<Minus className="size-3.5" />
								</Button>
							}
						/>
						<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
							Zoom Out
						</TooltipContent>
					</Tooltip>

					<button
						type="button"
						onClick={onResetZoom}
						className="text-[13px] text-muted-foreground tabular-nums w-[48px] text-center hover:text-heading cursor-pointer"
					>
						{Math.round(scale * 100)}%
					</button>

					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="outline"
									size="icon"
									aria-label="Zoom In"
									className="size-8 rounded-[8px] border-border"
									onClick={onZoomIn}
									disabled={scale >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
								>
									<Plus className="size-3.5" />
								</Button>
							}
						/>
						<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
							Zoom In
						</TooltipContent>
					</Tooltip>

					{scale !== DEFAULT_SCALE && (
						<Tooltip>
							<TooltipTrigger
								render={
									<Button
										variant="ghost"
										size="icon"
										aria-label="Reset Zoom"
										className="size-8 rounded-[8px] text-muted-foreground hover:text-heading"
										onClick={onResetZoom}
									>
										<RotateCcw className="size-3.5" />
									</Button>
								}
							/>
							<TooltipContent className="bg-zinc-950 text-white border-zinc-800 px-2 py-1 text-[11px] shadow-lg rounded-[6px] z-50">
								Reset Zoom
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		</>
	);
}
