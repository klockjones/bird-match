import { z } from "zod";

export const playerImportRowSchema = z.object({
  name: z.string().trim().min(2, "name 컬럼이 필요합니다."),
  gender: z.string().trim().optional(),
  level: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  memo: z.string().trim().optional(),
  team: z.string().trim().max(30).optional(),
  seed: z.string().trim().optional(),
});

export const matchImportRowSchema = z.object({
  round_name: z.string().trim().optional(),
  group_name: z.string().trim().optional(),
  match_no: z.coerce.number().int().positive("match_no 컬럼이 필요합니다."),
  court_no: z.string().trim().optional(),
  status: z.enum(["waiting", "ready", "playing", "done"]).default("waiting"),
  scheduled_at: z.string().trim().optional(),
  sort_order: z.coerce.number().int().min(0).default(0),
  note: z.string().trim().optional(),
  player_a1: z.string().trim().min(1, "player_a1 컬럼이 필요합니다."),
  player_a2: z.string().trim().optional(),
  player_b1: z.string().trim().min(1, "player_b1 컬럼이 필요합니다."),
  player_b2: z.string().trim().optional(),
});
