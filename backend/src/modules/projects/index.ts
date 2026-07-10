import { Hono } from "hono";
import activate from "./activate.routes.js";
import crud from "./crud.routes.js";
import reporting from "./reporting.routes.js";
import status from "./status.routes.js";

const router = new Hono();
router.route("/", crud);
router.route("/", status);
router.route("/", activate);
router.route("/", reporting);

export default router;
