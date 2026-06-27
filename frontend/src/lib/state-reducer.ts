export function stateReducer<T>(
	state: T,
	partial: Partial<T> | ((prev: T) => Partial<T>),
): T {
	const next = typeof partial === "function" ? partial(state) : partial;
	return { ...state, ...next };
}
