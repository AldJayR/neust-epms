export const DISPLAY_SIZE_STORAGE_KEY = "epms-display-size";

export const DISPLAY_SIZE_OPTIONS = [
	{ value: "default", label: "Default", percent: 100 },
	{ value: "larger", label: "Larger", percent: 112.5 },
	{ value: "largest", label: "Largest", percent: 125 },
] as const;

export type DisplaySize = (typeof DISPLAY_SIZE_OPTIONS)[number]["value"];

export function getDisplaySizeOption(value: unknown) {
	return (
		DISPLAY_SIZE_OPTIONS.find((option) => option.value === value) ??
		DISPLAY_SIZE_OPTIONS[0]
	);
}

/** Apply the saved preference before first paint; only known presets reach the DOM. */
export function getDisplaySizeInitScript() {
	const key = JSON.stringify(DISPLAY_SIZE_STORAGE_KEY);
	const options = JSON.stringify(
		DISPLAY_SIZE_OPTIONS.map(({ value, percent }) => ({ value, percent })),
	);
	return `(function(){var value=null;try{value=localStorage.getItem(${key})}catch(e){}var options=${options};var option=options.find(function(item){return item.value===value})||options[0];var root=document.documentElement;root.dataset.displaySize=option.value;root.style.setProperty('--app-font-size',option.percent+'%')})();`;
}
