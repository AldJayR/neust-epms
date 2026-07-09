import { Hono } from "hono";
import crud from "./crud.routes.js";
import status from "./status.routes.js";
import activate from "./activate.routes.js";
import reporting from "./reporting.routes.js";

const router = new Hono();
router.route("/", crud);
router.route("/", status);
router.route("/", activate);
router.route("/", reporting);

export default router;
