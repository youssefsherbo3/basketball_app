import { Router } from "express";
import { db, evaluationCriteriaTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateCriterionBody,
  ToggleCriterionParams,
} from "@workspace/api-zod";
import { requireAuth, requireHeadCoach } from "../lib/auth";

const router = Router();

router.get("/criteria", requireAuth, async (_req, res): Promise<void> => {
  const criteria = await db.select().from(evaluationCriteriaTable);
  res.json(criteria.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    isActive: c.isActive,
  })));
});

router.post("/criteria", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const parsed = CreateCriterionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [criterion] = await db.insert(evaluationCriteriaTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    isActive: true,
  }).returning();

  res.status(201).json({ id: criterion.id, name: criterion.name, description: criterion.description, isActive: criterion.isActive });
});

router.patch("/criteria/:id/toggle", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const params = ToggleCriterionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(evaluationCriteriaTable).where(eq(evaluationCriteriaTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [criterion] = await db.update(evaluationCriteriaTable)
    .set({ isActive: !existing.isActive })
    .where(eq(evaluationCriteriaTable.id, params.data.id))
    .returning();

  res.json({ id: criterion.id, name: criterion.name, description: criterion.description, isActive: criterion.isActive });
});

export default router;
