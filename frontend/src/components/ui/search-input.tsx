import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
	const [prevValue, setPrevValue] = useState<string | null>(null);
	const [localValue, setLocalValue] = useState<string | null>(null);

	if (prevValue === null) {
		setPrevValue(value);
	} else if (value !== prevValue) {
		setPrevValue(value);
		setLocalValue(null);
	}

	const displayValue = localValue !== null ? localValue : value;

	const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
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
	};

	useEffect(() => {
		const ref = timerRef;
		return () => {
			if (ref.current !== undefined) {
				clearTimeout(ref.current);
			}
		};
	}, []);

	return (
		<div className="relative w-full" data-prev-value={prevValue}>
			<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				placeholder={placeholder}
				aria-label={ariaLabel}
				className={cn(
					"h-9 rounded-lg border-border bg-background pl-9 shadow-none placeholder:text-muted-foreground",
					className,
				)}
				value={displayValue}
				onChange={handleInputChange}
			/>
		</div>
	);
}

export { SearchInput };
export type { SearchInputProps };

