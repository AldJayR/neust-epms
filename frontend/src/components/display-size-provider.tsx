import { ScriptOnce } from "@tanstack/react-router";
import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";
import {
	DISPLAY_SIZE_STORAGE_KEY,
	type DisplaySize,
	getDisplaySizeInitScript,
	getDisplaySizeOption,
} from "@/lib/display-size";

type DisplaySizeContextValue = {
	displaySize: DisplaySize;
	setDisplaySize: (size: DisplaySize) => void;
	storageAvailable: boolean;
};

const DisplaySizeContext = createContext<DisplaySizeContextValue | null>(null);

function applyDisplaySize(value: unknown): DisplaySize {
	const option = getDisplaySizeOption(value);
	const root = document.documentElement;
	root.dataset.displaySize = option.value;
	root.style.setProperty("--app-font-size", `${option.percent}%`);
	return option.value;
}

export function DisplaySizeProvider({ children }: { children: ReactNode }) {
	const [displaySize, setDisplaySizeState] = useState<DisplaySize>("default");
	const [storageAvailable, setStorageAvailable] = useState(true);

	useEffect(() => {
		let saved: string | null = null;
		try {
			saved = localStorage.getItem(DISPLAY_SIZE_STORAGE_KEY);
		} catch {
			setStorageAvailable(false);
		}
		setDisplaySizeState(applyDisplaySize(saved));

		const onStorage = (event: StorageEvent) => {
			if (event.key !== DISPLAY_SIZE_STORAGE_KEY && event.key !== null) return;
			try {
				if (event.storageArea !== localStorage) return;
			} catch {
				return;
			}
			setDisplaySizeState(applyDisplaySize(event.newValue));
			setStorageAvailable(true);
		};
		window.addEventListener("storage", onStorage);
		return () => window.removeEventListener("storage", onStorage);
	}, []);

	const setDisplaySize = (value: DisplaySize) => {
		const next = applyDisplaySize(value);
		setDisplaySizeState(next);
		try {
			localStorage.setItem(DISPLAY_SIZE_STORAGE_KEY, next);
			setStorageAvailable(true);
		} catch {
			// Keep the control usable even when browser storage is unavailable.
			setStorageAvailable(false);
		}
	};

	return (
		<DisplaySizeContext
			value={{ displaySize, setDisplaySize, storageAvailable }}
		>
			{children}
		</DisplaySizeContext>
	);
}

export function DisplaySizeScript() {
	return <ScriptOnce>{getDisplaySizeInitScript()}</ScriptOnce>;
}

export function useDisplaySize() {
	const context = useContext(DisplaySizeContext);
	if (!context)
		throw new Error("useDisplaySize must be used within DisplaySizeProvider");
	return context;
}
