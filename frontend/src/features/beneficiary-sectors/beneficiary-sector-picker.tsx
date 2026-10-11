import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { type Ref, useEffect, useId, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { sectorSearchQueryOptions } from "./functions";
import {
	MAX_SECTOR_LABEL_LENGTH,
	normalizeSectorLabel,
	sameSector,
	sectorLabelLength,
	type SectorSearchItem,
	type SectorSelection,
} from "./schema";

type SectorOption = SectorSelection & { create?: boolean };

interface BeneficiarySectorPickerProps {
	id?: string;
	inputRef?: Ref<HTMLInputElement>;
	value: SectorSelection[];
	onChange: (sectors: SectorSelection[]) => void;
	onBlur?: () => void;
	invalid?: boolean;
}

export function BeneficiarySectorPicker({
	id,
	inputRef,
	value,
	onChange,
	onBlur,
	invalid,
}: BeneficiarySectorPickerProps) {
	const [query, setQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [open, setOpen] = useState(false);
	const highlighted = useRef<SectorOption | null>(null);
	const [hasHighlightedOption, setHasHighlightedOption] = useState(false);
	const [suggestionWindow, setSuggestionWindow] = useState<{
		query: string;
		items: SectorSearchItem[];
	}>({ query: "", items: [] });
	const statusId = useId();
	const text = query.trim();
	useEffect(() => {
		const timeout = setTimeout(() => setDebouncedQuery(query), 300);
		return () => clearTimeout(timeout);
	}, [query]);
	const search = useQuery({
		...sectorSearchQueryOptions(debouncedQuery),
		enabled:
			open && sectorLabelLength(debouncedQuery) <= MAX_SECTOR_LABEL_LENGTH,
	});
	// Never display a previous query's suggestions while a new query is settling.
	const current = debouncedQuery === query;
	useEffect(() => {
		// Base UI tracks an active index. Freeze the result window during navigation
		// so a response cannot replace the user's highlighted action at that index.
		if (!open || !current || hasHighlightedOption) return;
		setSuggestionWindow((previous) =>
			previous.query === query && previous.items === search.data?.items
				? previous
				: { query, items: search.data?.items ?? [] },
		);
	}, [open, current, hasHighlightedOption, query, search.data]);
	const suggestions =
		current && suggestionWindow.query === query ? suggestionWindow.items : [];
	const exact = suggestions.find((sector) => sector.isExact);
	const alreadySelected =
		value.some(
			(sector) =>
				normalizeSectorLabel(sector.sectorName) === normalizeSectorLabel(query),
		) ||
		(exact !== undefined &&
			value.some((sector) => sector.sectorId === exact.sectorId));
	const canAdd =
		text.length > 0 &&
		sectorLabelLength(query) <= MAX_SECTOR_LABEL_LENGTH &&
		value.length < 100 &&
		!alreadySelected;
	const options: SectorOption[] = [
		...suggestions.filter(
			(sector) => !value.some((selected) => sameSector(selected, sector)),
		),
		...(canAdd && !exact
			? [{ sectorName: query, enteredLabels: [query], create: true }]
			: []),
	];
	const add = (sector: SectorSelection) => {
		if (value.length >= 100) return;
		if (!value.some((selected) => sameSector(selected, sector))) {
			onChange([
				...value,
				{
					sectorId: sector.sectorId,
					sectorName: sector.sectorName,
					enteredLabels: sector.enteredLabels ?? [sector.sectorName],
				},
			]);
		}
		setQuery("");
		setOpen(false);
		highlighted.current = null;
		setHasHighlightedOption(false);
	};
	const addTyped = () => {
		if (!canAdd) return;
		add({
			sectorId: exact?.sectorId,
			sectorName: exact?.sectorName ?? query,
			enteredLabels: [query],
		});
	};
	const loading = open && (!current || search.isFetching);
	const unavailable = current && search.isError;

	return (
		<div className="min-w-0 space-y-2">
			<div className="flex min-w-0 flex-wrap items-center gap-1.5 rounded-md border p-2">
				{value.map((sector) => (
					<Badge
						key={sector.sectorId ?? normalizeSectorLabel(sector.sectorName)}
						variant="secondary"
						className="h-9 max-w-full gap-1 pr-1"
					>
						<span className="min-w-0 truncate" title={sector.sectorName}>
							{sector.sectorName}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							className="shrink-0 rounded-full"
							onClick={() =>
								onChange(value.filter((selected) => selected !== sector))
							}
							aria-label={`Remove ${sector.sectorName}`}
						>
							<X className="size-3" />
						</Button>
					</Badge>
				))}
				<div className="flex min-w-0 flex-1 basis-60 items-center gap-2">
					<div className="min-w-0 flex-1">
						<Combobox<SectorOption>
							items={options}
							filter={null}
							value={null}
							inputValue={query}
							open={open}
							onOpenChange={(next) => {
								setOpen(next);
								if (!next) {
									highlighted.current = null;
									setHasHighlightedOption(false);
								}
							}}
							itemToStringLabel={(sector) => sector.sectorName}
							onInputValueChange={(next, details) => {
								if (
									details.reason === "input-change" ||
									details.reason === "input-clear"
								) {
									setQuery(
										[...next].slice(0, MAX_SECTOR_LABEL_LENGTH).join(""),
									);
									highlighted.current = null;
									setHasHighlightedOption(false);
								}
							}}
							onItemHighlighted={(sector) => {
								highlighted.current = sector ?? null;
								setHasHighlightedOption(sector !== undefined);
							}}
							onValueChange={(sector) => {
								if (sector) add(sector);
							}}
						>
							<ComboboxInput
								id={id}
								ref={inputRef}
								className="w-full"
								aria-invalid={invalid}
								aria-describedby={statusId}
								maxLength={MAX_SECTOR_LABEL_LENGTH * 2}
								onBlur={onBlur}
								placeholder={
									value.length
										? "Search or add another sector"
										: "Search or add a sector"
								}
								onKeyDown={(event) => {
									if (
										event.key === "Enter" &&
										!event.nativeEvent.isComposing &&
										!highlighted.current
									) {
										event.preventDefault();
										addTyped();
									}
								}}
							/>
							<ComboboxContent className="min-w-0 bg-popover before:hidden">
								<ComboboxList>
									{options.map((sector) => (
										<ComboboxItem
											key={sector.sectorId ?? `new:${sector.sectorName}`}
											value={sector}
										>
											<span className="min-w-0 break-words whitespace-normal">
												{sector.create
													? `Add “${sector.sectorName}”`
													: sector.sectorName}
											</span>
										</ComboboxItem>
									))}
								</ComboboxList>
								{loading && (
									<p className="px-3 py-2 text-xs text-muted-foreground">
										Searching existing sectors…
									</p>
								)}
								{!loading && !unavailable && options.length === 0 && (
									<p className="px-3 py-2 text-xs text-muted-foreground">
										{alreadySelected
											? "This sector is already selected."
											: "Type a sector to find or add it."}
									</p>
								)}
								{unavailable && (
									<p className="px-3 py-2 text-xs text-muted-foreground">
										Suggestions unavailable. You can still add a sector.
									</p>
								)}
							</ComboboxContent>
						</Combobox>
					</div>
					<Button type="button" size="sm" onClick={addTyped} disabled={!canAdd}>
						Add
					</Button>
				</div>
			</div>
			<p
				id={statusId}
				className="text-xs text-muted-foreground"
				aria-live="polite"
			>
				{unavailable
					? "Suggestions unavailable. New sectors can still be saved."
					: "Choose an existing sector or add a new group specific to your project."}
			</p>
		</div>
	);
}
