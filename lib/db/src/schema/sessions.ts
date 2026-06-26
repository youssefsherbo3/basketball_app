import { pgTable, serial, text, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trainingSessionsTable = pgTable("training_sessions", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  notes: text("notes"),
  createdBy: integer("created_by"),
});

export const insertSessionSchema = createInsertSchema(trainingSessionsTable).omit({ id: true });
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type TrainingSession = typeof trainingSessionsTable.$inferSelect;
