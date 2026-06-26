import { Router } from "express";
import { db, playersTable, teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListPlayersParams,
  CreatePlayerParams,
  CreatePlayerBody,
  UpdatePlayerParams,
  UpdatePlayerBody,
  DeletePlayerParams,
  TogglePlayerParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

function hasTeamAccess(req: { session: { role?: string; userId?: number } }, team: { coachId: number | null }): boolean {
  if (req.session.role === "head_coach") return true;
  return team.coachId === req.session.userId;
}

router.get("/teams/:id/players", requireAuth, async (req, res): Promise<void> => {
  const params = ListPlayersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  if (!hasTeamAccess(req, team)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const players = await db.select().from(playersTable).where(eq(playersTable.teamId, params.data.id));
  res.json(players.map((p) => ({
    id: p.id,
    name: p.name,
    teamId: p.teamId,
    position: p.position,
    jerseyNumber: p.jerseyNumber,
    isActive: p.isActive,
  })));
});

router.post("/teams/:id/players", requireAuth, async (req, res): Promise<void> => {
  const params = CreatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  if (!hasTeamAccess(req, team)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [player] = await db.insert(playersTable).values({
    name: parsed.data.name,
    teamId: params.data.id,
    position: parsed.data.position ?? null,
    jerseyNumber: parsed.data.jerseyNumber ?? null,
    isActive: true,
  }).returning();

  res.status(201).json({
    id: player.id,
    name: player.name,
    teamId: player.teamId,
    position: player.position,
    jerseyNumber: player.jerseyNumber,
    isActive: player.isActive,
  });
});

router.patch("/players/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, existing.teamId));
  if (!hasTeamAccess(req, team!)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.name != null) updates.name = parsed.data.name;
  if (parsed.data.position != null) updates.position = parsed.data.position;
  if ("jerseyNumber" in parsed.data) updates.jerseyNumber = parsed.data.jerseyNumber ?? null;

  const [player] = await db.update(playersTable).set(updates).where(eq(playersTable.id, params.data.id)).returning();
  res.json({ id: player.id, name: player.name, teamId: player.teamId, position: player.position, jerseyNumber: player.jerseyNumber, isActive: player.isActive });
});

router.delete("/players/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeletePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(playersTable).where(eq(playersTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/players/:id/toggle", requireAuth, async (req, res): Promise<void> => {
  const params = TogglePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [player] = await db.update(playersTable).set({ isActive: !existing.isActive }).where(eq(playersTable.id, params.data.id)).returning();
  res.json({ id: player.id, name: player.name, teamId: player.teamId, position: player.position, jerseyNumber: player.jerseyNumber, isActive: player.isActive });
});

export default router;
