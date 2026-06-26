import { pgTable, serial, text, integer, boolean, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  playerId: integer("player_id").notNull(),
  status: text("status").notNull().default("present"),
  note: text("note"),
}, (table) => [
  unique("uq_attendance_session_player").on(table.sessionId, table.playerId),
]);

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;

export const evaluationCriteriaTable = pgTable("evaluation_criteria", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCriterionSchema = createInsertSchema(evaluationCriteriaTable).omit({ id: true });
export type InsertCriterion = z.infer<typeof insertCriterionSchema>;
export type EvaluationCriterion = typeof evaluationCriteriaTable.$inferSelect;

export const evaluationsTable = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  playerId: integer("player_id").notNull(),
  criterionId: integer("criterion_id").notNull(),
  score: integer("score").notNull(),
  note: text("note"),
}, (table) => [
  unique("uq_eval_session_player_criterion").on(table.sessionId, table.playerId, table.criterionId),
]);

export const insertEvaluationSchema = createInsertSchema(evaluationsTable).omit({ id: true });
export type InsertEvaluation = z.infer<typeof insertEvaluationSchema>;
export type Evaluation = typeof evaluationsTable.$inferSelect;
