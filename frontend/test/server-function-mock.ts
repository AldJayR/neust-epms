type InputValidator<T> =
	| ((data: unknown) => T | Promise<T>)
	| { parseAsync: (data: unknown) => Promise<T> };

/**
 * Test-only replacement for Start's compiled RPC boundary. Keeps the real
 * input validation and handler; does not emulate request middleware or sessions.
 * Session authorization must be mocked explicitly by each test suite.
 */
export function createServerFnMock() {
	return {
		validator<T>(validator: InputValidator<T>) {
			return {
				handler<R>(handler: (context: { data: T }) => R) {
					return async ({ data }: { data: unknown }) => {
						const validatedData = await (typeof validator === "function"
							? validator(data)
							: validator.parseAsync(data));
						return handler({ data: validatedData });
					};
				},
			};
		},
	};
}
