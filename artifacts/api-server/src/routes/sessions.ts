import { Router } from "express";
import { db, trainingSessionsTable, playersTable, teamsTable, attendanceTable, evaluationCriteriaTable, evaluationsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  ListSessionsParams,
  CreateSessionParams,
  CreateSessionBody,
  GetSessionParams,
  DeleteSessionParams,
  SaveAttendanceParams,
  SaveAttendanceBody,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

function hasTeamAccess(req: { session: { role?: string; userId?: number } }, team: { coachId: number | null }): boolean {
  if (req.session.role === "head_coach") return true;
  return team.coachId === req.session.userId;
}

router.get("/teams/:id/sessions", requireAuth, async (req, res): Promise<void> => {
  const params = ListSessionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!team || !hasTeamAccess(req, team)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const sessions = await db.select().from(trainingSessionsTable)
    .where(eq(trainingSessionsTable.teamId, params.data.id))
    .orderBy(trainingSessionsTable.date);

  const result = await Promise.all(sessions.map(async (s) => {
    const atts = await db.select().from(attendanceTable).where(eq(attendanceTable.sessionId, s.id));
    return {
      id: s.id,
      teamId: s.teamId,
      date: s.date,
      notes: s.notes,
      attendanceCount: atts.filter((a) => a.status === "present").length,
    };
  }));

  res.json(result.reverse()); // newest first
});

router.post("/teams/:id/sessions", requireAuth, async (req, res): Promise<void> => {
  const params = CreateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, params.data.id));
  if (!team || !hasTeamAccess(req, team)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [session] = await db.insert(trainingSessionsTable).values({
    teamId: params.data.id,
    date: parsed.data.date,
    notes: parsed.data.notes ?? null,
    createdBy: req.session.userId,
  }).returning();

  res.status(201).json({
    id: session.id,
    teamId: session.teamId,
    date: session.date,
    notes: session.notes,
    attendanceCount: 0,
  });
});

router.get("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db.select().from(trainingSessionsTable).where(eq(trainingSessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, session.teamId));
  if (!team || !hasTeamAccess(req, team)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const players = await db.select().from(playersTable)
    .where(and(eq(playersTable.teamId, session.teamId), eq(playersTable.isActive, true)));

  const criteria = await db.select().from(evaluationCriteriaTable)
    .where(eq(evaluationCriteriaTable.isActive, true));

  const playerIds = players.map((p) => p.id);
  const attendances = playerIds.length > 0
    ? await db.select().from(attendanceTable).where(and(eq(attendanceTable.sessionId, session.id), inArray(attendanceTable.playerId, playerIds)))
    : [];

  const evaluations = playerIds.length > 0
    ? await db.select().from(evaluationsTable).where(and(eq(evaluationsTable.sessionId, session.id), inArray(evaluationsTable.playerId, playerIds)))
    : [];

  const attMap = new Map(attendances.map((a) => [a.playerId, a]));
  const evalMap = new Map<number, Map<number, number>>();
  for (const e of evaluations) {
    if (!evalMap.has(e.playerId)) evalMap.set(e.playerId, new Map());
    evalMap.get(e.playerId)!.set(e.criterionId, e.score);
  }

  const playerData = players.map((p) => {
    const att = attMap.get(p.id);
    const evals = criteria.map((c) => ({
      criterionId: c.id,
      criterionName: c.name,
      score: evalMap.get(p.id)?.get(c.id) ?? 0,
    }));
    return {
      playerId: p.id,
      playerName: p.name,
      jerseyNumber: p.jerseyNumber,
      status: att?.status ?? "present",
      note: att?.note ?? null,
      evaluations: evals,
    };
  });

  res.json({
    id: session.id,
    teamId: session.teamId,
    date: session.date,
    notes: session.notes,
    players: playerData,
    criteria: criteria.map((c) => ({ id: c.id, name: c.name, description: c.description, isActive: c.isActive })),
  });
});

router.delete("/sessions/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(trainingSessionsTable).where(eq(trainingSessionsTable.id, params.data.id));
  res.sendStatus(204);
});

router.post("/sessions/:id/attendance", requireAuth, async (req, res): Promise<void> => {
  const params = SaveAttendanceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SaveAttendanceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db.select().from(trainingSessionsTable).where(eq(trainingSessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  for (const entry of parsed.data.entries) {
    // Upsert attendance
    const existing = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.sessionId, session.id), eq(attendanceTable.playerId, entry.playerId)));

    if (existing.length > 0) {
      await db.update(attendanceTable)
        .set({ status: entry.status, note: entry.note ?? null })
        .where(and(eq(attendanceTable.sessionId, session.id), eq(attendanceTable.playerId, entry.playerId)));
    } else {
      await db.insert(attendanceTable).values({
        sessionId: session.id,
        playerId: entry.playerId,
        status: entry.status,
        note: entry.note ?? null,
      });
    }

    // Upsert evaluations (only if not absent)
    if (entry.status !== "absent" && entry.scores) {
      for (const score of entry.scores) {
        const existingEval = await db.select().from(evaluationsTable)
          .where(and(
            eq(evaluationsTable.sessionId, session.id),
            eq(evaluationsTable.playerId, entry.playerId),
            eq(evaluationsTable.criterionId, score.criterionId),
          ));

        if (existingEval.length > 0) {
          await db.update(evaluationsTable)
            .set({ score: score.score })
            .where(and(
              eq(evaluationsTable.sessionId, session.id),
              eq(evaluationsTable.playerId, entry.playerId),
              eq(evaluationsTable.criterionId, score.criterionId),
            ));
        } else {
          await db.insert(evaluationsTable).values({
            sessionId: session.id,
            playerId: entry.playerId,
            criterionId: score.criterionId,
            score: score.score,
          });
        }
      }
    }
  }

  // Return updated session detail
  const players = await db.select().from(playersTable)
    .where(and(eq(playersTable.teamId, session.teamId), eq(playersTable.isActive, true)));
  const criteria = await db.select().from(evaluationCriteriaTable).where(eq(evaluationCriteriaTable.isActive, true));

  const playerIds = players.map((p) => p.id);
  const attendances = playerIds.length > 0
    ? await db.select().from(attendanceTable).where(and(eq(attendanceTable.sessionId, session.id), inArray(attendanceTable.playerId, playerIds)))
    : [];
  const evaluations = playerIds.length > 0
    ? await db.select().from(evaluationsTable).where(and(eq(evaluationsTable.sessionId, session.id), inArray(evaluationsTable.playerId, playerIds)))
    : [];

  const attMap = new Map(attendances.map((a) => [a.playerId, a]));
  const evalMap = new Map<number, Map<number, number>>();
  for (const e of evaluations) {
    if (!evalMap.has(e.playerId)) evalMap.set(e.playerId, new Map());
    evalMap.get(e.playerId)!.set(e.criterionId, e.score);
  }

  res.json({
    id: session.id,
    teamId: session.teamId,
    date: session.date,
    notes: session.notes,
    players: players.map((p) => {
      const att = attMap.get(p.id);
      return {
        playerId: p.id,
        playerName: p.name,
        jerseyNumber: p.jerseyNumber,
        status: att?.status ?? "present",
        note: att?.note ?? null,
        evaluations: criteria.map((c) => ({
          criterionId: c.id,
          criterionName: c.name,
          score: evalMap.get(p.id)?.get(c.id) ?? 0,
        })),
      };
    }),
    criteria: criteria.map((c) => ({ id: c.id, name: c.name, description: c.description, isActive: c.isActive })),
  });
});

export default router;
