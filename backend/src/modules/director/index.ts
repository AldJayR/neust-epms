import { Hono } from "hono";
import dashboard from "./dashboard.routes.js";
import emailReport from "./email-report.routes.js";
import facultyDirectory from "./faculty-directory.routes.js";
import moaRepository from "./moa-repository.routes.js";
import projectHub from "./project-hub.routes.js";

const router = new Hono();
router.route("/", dashboard);
router.route("/", facultyDirectory);
router.route("/", moaRepository);
router.route("/", projectHub);
router.route("/", emailReport);

export default router;
