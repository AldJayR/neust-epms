const nonces = new Map<string, string>();

function getRequestKey(request: Request): string {
	return request.headers.get("cf-ray") ?? request.url;
}

export function getCspNonce(request: Request): string {
	const key = getRequestKey(request);
	let nonce = nonces.get(key);
	if (!nonce) {
		nonce = crypto.randomUUID();
		nonces.set(key, nonce);
	}
	return nonce;
}

export function clearCspNonce(request: Request): void {
	nonces.delete(getRequestKey(request));
}
