import { Router } from "express";
import { db, teamsTable, playersTable, trainingSessionsTable, attendanceTable, evaluationCriteriaTable, evaluationsTable, usersTable } from "@workspace/db";
import { eq, and, inArray, count, sql } from "drizzle-orm";
import { GetTeamReportParams, GetTeamReportBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router = Router();

function hasTeamAccess(req: { session: { role?: string; userId?: number } }, team: { coachId: number | null }): boolean {
  if (req.session.role === "head_coach") return true;
  return team.coachId === req.session.userId;
}

router.post("/reports/team/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetTeamReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = GetTeamReportBody.safeParse(req.body);
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

  const { dateFrom, dateTo } = parsed.data;

  let sessionsQuery = db.select().from(trainingSessionsTable).where(eq(trainingSessionsTable.teamId, team.id));
  if (dateFrom || dateTo) {
    const conditions = [eq(trainingSessionsTable.teamId, team.id)];
    if (dateFrom) conditions.push(sql`${trainingSessionsTable.date} >= ${dateFrom}`);
    if (dateTo) conditions.push(sql`${trainingSessionsTable.date} <= ${dateTo}`);
    sessionsQuery = db.select().from(trainingSessionsTable).where(and(...conditions));
  }

  const sessions = await sessionsQuery;
  const sessionIds = sessions.map((s) => s.id);

  const criteria = await db.select().from(evaluationCriteriaTable).where(eq(evaluationCriteriaTable.isActive, true));
  const players = await db.select().from(playersTable).where(eq(playersTable.teamId, team.id));

  const allAttendances = sessionIds.length > 0
    ? await db.select().from(attendanceTable).where(inArray(attendanceTable.sessionId, sessionIds))
    : [];

  const allEvaluations = sessionIds.length > 0
    ? await db.select().from(evaluationsTable).where(inArray(evaluationsTable.sessionId, sessionIds))
    : [];

  const playerReports = players.map((player) => {
    const atts = allAttendances.filter((a) => a.playerId === player.id);
    const present = atts.filter((a) => a.status === "present").length;
    const absent = atts.filter((a) => a.status === "absent").length;
    const late = atts.filter((a) => a.status === "late").length;
    const excused = atts.filter((a) => a.status === "excused").length;
    const total = atts.length;
    const attendancePct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

    const evals = allEvaluations.filter((e) => e.playerId === player.id);
    const overallAvg = evals.length > 0
      ? Math.round((evals.reduce((sum, e) => sum + e.score, 0) / evals.length) * 10) / 10
      : null;

    const criteriaAvgs = criteria.map((c) => {
      const cEvals = evals.filter((e) => e.criterionId === c.id);
      return {
        criterionId: c.id,
        criterionName: c.name,
        avg: cEvals.length > 0
          ? Math.round((cEvals.reduce((sum, e) => sum + e.score, 0) / cEvals.length) * 10) / 10
          : null,
      };
    });

    return {
      playerId: player.id,
      playerName: player.name,
      jerseyNumber: player.jerseyNumber,
      totalSessions: total,
      present,
      absent,
      late,
      excused,
      attendancePct,
      overallAvg,
      criteriaAvgs,
    };
  });

  res.json({
    teamId: team.id,
    teamName: team.name,
    totalSessions: sessions.length,
    criteria: criteria.map((c) => ({ id: c.id, name: c.name, description: c.description, isActive: c.isActive })),
    players: playerReports,
  });
});

// CSV export — direct download, no generated hook needed
router.get("/reports/team/:id/export/csv", requireAuth, async (req, res): Promise<void> => {
  const teamId = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { dateFrom, dateTo } = req.query as { dateFrom?: string; dateTo?: string };

  const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
  if (!team) {
    res.status(404).json({ error: "Team not found" });
    return;
  }
  if (!hasTeamAccess(req, team)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const conditions = [eq(trainingSessionsTable.teamId, teamId)];
  if (dateFrom) conditions.push(sql`${trainingSessionsTable.date} >= ${dateFrom}`);
  if (dateTo) conditions.push(sql`${trainingSessionsTable.date} <= ${dateTo}`);

  const sessions = await db.select().from(trainingSessionsTable).where(and(...conditions));
  const sessionIds = sessions.map((s) => s.id);

  const criteria = await db.select().from(evaluationCriteriaTable).where(eq(evaluationCriteriaTable.isActive, true));
  const players = await db.select().from(playersTable).where(eq(playersTable.teamId, teamId));

  const allAttendances = sessionIds.length > 0
    ? await db.select().from(attendanceTable).where(inArray(attendanceTable.sessionId, sessionIds))
    : [];
  const allEvaluations = sessionIds.length > 0
    ? await db.select().from(evaluationsTable).where(inArray(evaluationsTable.sessionId, sessionIds))
    : [];

  const headers = ["اللاعب", "رقم القميص", "عدد التمارين", "حاضر", "غائب", "متأخر", "معذور", "نسبة الحضور %",
    ...criteria.map((c) => c.name), "المتوسط العام"];

  const rows = players.map((player) => {
    const atts = allAttendances.filter((a) => a.playerId === player.id);
    const present = atts.filter((a) => a.status === "present").length;
    const absent = atts.filter((a) => a.status === "absent").length;
    const late = atts.filter((a) => a.status === "late").length;
    const excused = atts.filter((a) => a.status === "excused").length;
    const total = atts.length;
    const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

    const evals = allEvaluations.filter((e) => e.playerId === player.id);
    const overallAvg = evals.length > 0
      ? Math.round((evals.reduce((sum, e) => sum + e.score, 0) / evals.length) * 10) / 10
      : "";

    const critVals = criteria.map((c) => {
      const cEvals = evals.filter((e) => e.criterionId === c.id);
      return cEvals.length > 0
        ? String(Math.round((cEvals.reduce((sum, e) => sum + e.score, 0) / cEvals.length) * 10) / 10)
        : "";
    });

    return [player.name, player.jerseyNumber ?? "", total, present, absent, late, excused, pct, ...critVals, overallAvg];
  });

  const csvLines = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","));
  const csv = "\uFEFF" + csvLines.join("\r\n"); // UTF-8 BOM for Excel Arabic support

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="report_${team.name}.csv"`);
  res.send(csv);
});

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const userId = req.session.userId!;
  const role = req.session.role!;

  let teams;
  if (role === "head_coach") {
    teams = await db.select().from(teamsTable);
  } else {
    teams = await db.select().from(teamsTable).where(eq(teamsTable.coachId, userId));
  }

  const [{ coachCount }] = await db.select({ coachCount: count() }).from(usersTable).where(eq(usersTable.role, "coach"));
  const [{ playerCount }] = await db.select({ playerCount: count() }).from(playersTable);
  const [{ sessionCount }] = await db.select({ sessionCount: count() }).from(trainingSessionsTable);

  const teamStats = await Promise.all(teams.map(async (team) => {
    const [{ sc }] = await db.select({ sc: count() }).from(trainingSessionsTable).where(eq(trainingSessionsTable.teamId, team.id));
    const [{ pc }] = await db.select({ pc: count() }).from(playersTable).where(and(eq(playersTable.teamId, team.id), eq(playersTable.isActive, true)));

    let coachName: string | null = null;
    if (team.coachId) {
      const [coach] = await db.select().from(usersTable).where(eq(usersTable.id, team.coachId));
      coachName = coach?.fullName ?? null;
    }

    return {
      teamId: team.id,
      teamName: team.name,
      ageCategory: team.ageCategory,
      coachName,
      sessionsCount: Number(sc),
      playersCount: Number(pc),
    };
  }));

  res.json({
    totalTeams: teams.length,
    totalCoaches: Number(coachCount),
    totalPlayers: Number(playerCount),
    totalSessions: Number(sessionCount),
    teams: teamStats,
  });
});

export default router;
