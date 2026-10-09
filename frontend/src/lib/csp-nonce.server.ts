const nonces = new WeakMap<Request, string>();

export function getCspNonce(request: Request): string {
	let nonce = nonces.get(request);
	if (!nonce) {
		nonce = crypto.randomUUID();
		nonces.set(request, nonce);
	}
	return nonce;
}

export function clearCspNonce(request: Request): void {
	nonces.delete(request);
}
