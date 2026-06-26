import { Router } from "express";
import { db, teamsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateTeamBody,
  UpdateTeamBody,
  UpdateTeamParams,
  DeleteTeamParams,
} from "@workspace/api-zod";
import { requireAuth, requireHeadCoach } from "../lib/auth";

const router = Router();

async function formatTeam(team: typeof teamsTable.$inferSelect) {
  let coachName: string | null = null;
  if (team.coachId) {
    const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, team.coachId));
    coachName = coach?.fullName ?? null;
  }
  return {
    id: team.id,
    name: team.name,
    ageCategory: team.ageCategory,
    coachId: team.coachId,
    coachName,
  };
}

router.get("/teams", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const role = req.session.role!;

  let teams;
  if (role === "head_coach") {
    teams = await db.select().from(teamsTable);
  } else {
    teams = await db.select().from(teamsTable).where(eq(teamsTable.coachId, userId));
  }

  const result = await Promise.all(teams.map(formatTeam));
  res.json(result);
});

router.post("/teams", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const parsed = CreateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [team] = await db.insert(teamsTable).values({
    name: parsed.data.name,
    ageCategory: parsed.data.ageCategory ?? null,
    coachId: parsed.data.coachId ?? null,
  }).returning();

  res.status(201).json(await formatTeam(team));
});

router.patch("/teams/:id", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const params = UpdateTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTeamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.ageCategory != null) updates.ageCategory = parsed.data.ageCategory;
  if ("coachId" in parsed.data) updates.coachId = parsed.data.coachId ?? null;

  const [team] = await db.update(teamsTable).set(updates).where(eq(teamsTable.id, params.data.id)).returning();
  if (!team) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json(await formatTeam(team));
});

router.delete("/teams/:id", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const params = DeleteTeamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(teamsTable).where(eq(teamsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
