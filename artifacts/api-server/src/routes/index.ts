import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import coachesRouter from "./coaches";
import teamsRouter from "./teams";
import playersRouter from "./players";
import sessionsRouter from "./sessions";
import criteriaRouter from "./criteria";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(coachesRouter);
router.use(teamsRouter);
router.use(playersRouter);
router.use(sessionsRouter);
router.use(criteriaRouter);
router.use(reportsRouter);

export default router;
