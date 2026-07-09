import { OpenAPIHono } from "@hono/zod-openapi";
import { installApiErrorHandler } from "@/lib/errors.js";
import { type AuthEnv, authMiddleware } from "@/middleware/auth.js";
import { getActionCenterRoute } from "./action-center.schema.js";
import { getActionItemsForRole } from "./action-center.service.js";

const app = new OpenAPIHono<AuthEnv>();
installApiErrorHandler(app);

app.use("/action-center", authMiddleware);
app.use("/action-center/*", authMiddleware);

app.openapi(getActionCenterRoute, async (c) => {
	const user = c.get("user");
	const result = await getActionItemsForRole(user);
	return c.json(result, 200);
});

export default app;
