import { Hono } from "hono";
import comments from "./comments.routes.js";
import crud from "./crud.routes.js";
import review from "./review.routes.js";
import submit from "./submit.routes.js";

const router = new Hono();
router.route("/", crud);
router.route("/", submit);
router.route("/", review);
router.route("/", comments);
export default router;
