import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "#/lib/utils";

import { Input } from "./input";

interface SearchInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	ariaLabel?: string;
	debounceMs?: number;
	className?: string;
}

function SearchInput({
	value,
	onChange,
	placeholder,
	ariaLabel,
	debounceMs = 300,
	className,
}: SearchInputProps) {
	const [localValue, setLocalValue] = useState(value);
	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const handleChange = useCallback(
		(newValue: string) => {
			setLocalValue(newValue);
			if (timerRef.current !== undefined) {
				clearTimeout(timerRef.current);
			}
			if (debounceMs === 0) {
				onChange(newValue);
			} else {
				timerRef.current = setTimeout(() => {
					onChange(newValue);
				}, debounceMs);
			}
		},
		[debounceMs, onChange],
	);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	useEffect(() => {
		return () => {
			if (timerRef.current !== undefined) {
				clearTimeout(timerRef.current);
			}
		};
	}, []);

	return (
		<div className="relative w-full">
			<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder={placeholder}
				aria-label={ariaLabel}
				className={cn(
					"h-9 rounded-lg border-[#e5e5e5] bg-white pl-9 shadow-none placeholder:text-[#737373]",
					className,
				)}
				value={localValue}
				onChange={(e) => handleChange(e.target.value)}
			/>
		</div>
	);
}

export { SearchInput };
export type { SearchInputProps };
