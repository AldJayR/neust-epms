import { startStorageContext } from "@tanstack/start-storage-context";

if (startStorageContext && !startStorageContext.getStore()) {
	startStorageContext.enterWith({
		request: new Request("http://localhost:3000"),
	} as never);
}
