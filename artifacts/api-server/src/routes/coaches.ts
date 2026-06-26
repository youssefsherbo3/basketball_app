import { Router } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq, ne } from "drizzle-orm";
import {
  CreateCoachBody,
  UpdateCoachBody,
  UpdateCoachParams,
  DeleteCoachParams,
  ToggleCoachParams,
} from "@workspace/api-zod";
import { requireAuth, requireHeadCoach } from "../lib/auth";

const router = Router();

router.get("/coaches", requireAuth, requireHeadCoach, async (_req, res): Promise<void> => {
  const coaches = await db.select().from(usersTable).where(ne(usersTable.role, "head_coach"));
  res.json(coaches.map((c) => ({
    id: c.id,
    username: c.username,
    fullName: c.fullName,
    role: c.role,
    isActive: c.isActive,
  })));
});

router.post("/coaches", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const parsed = CreateCoachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, fullName, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.username, username));
  if (existing.length > 0) {
    res.status(400).json({ error: "اسم المستخدم موجود بالفعل" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [coach] = await db.insert(usersTable).values({
    username,
    fullName,
    passwordHash,
    role: "coach",
    isActive: true,
  }).returning();

  res.status(201).json({
    id: coach.id,
    username: coach.username,
    fullName: coach.fullName,
    role: coach.role,
    isActive: coach.isActive,
  });
});

router.patch("/coaches/:id", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const params = UpdateCoachParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCoachBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.fullName) updates.fullName = parsed.data.fullName;
  if (parsed.data.password) updates.passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const [coach] = await db.update(usersTable).set(updates).where(eq(usersTable.id, params.data.id)).returning();
  if (!coach) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  res.json({ id: coach.id, username: coach.username, fullName: coach.fullName, role: coach.role, isActive: coach.isActive });
});

router.delete("/coaches/:id", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const params = DeleteCoachParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, params.data.id));
  res.sendStatus(204);
});

router.patch("/coaches/:id/toggle", requireAuth, requireHeadCoach, async (req, res): Promise<void> => {
  const params = ToggleCoachParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const [coach] = await db.update(usersTable).set({ isActive: !existing.isActive }).where(eq(usersTable.id, params.data.id)).returning();
  res.json({ id: coach.id, username: coach.username, fullName: coach.fullName, role: coach.role, isActive: coach.isActive });
});

export default router;
