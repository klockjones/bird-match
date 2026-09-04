import { z } from "zod";

export const createPlayerSchema = z.object({
  name: z.string().trim().min(2, "이름은 2자 이상이어야 합니다.").max(50),
  gender: z.string().trim().max(20).optional(),
  level: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(30).optional(),
  memo: z.string().trim().max(200).optional(),
  isActive: z.enum(["true", "false"]).default("true"),
});

export const addEventPlayerSchema = z.object({
  eventId: z.string().uuid("올바른 이벤트 식별자가 아닙니다."),
  playerId: z.string().uuid("선수를 선택해주세요."),
  team: z.string().trim().max(30).optional(),
  seed: z.string().trim().optional(),
  note: z.string().trim().max(200).optional(),
});

export const createEventPlayerSchema = z.object({
  eventId: z.string().uuid("올바른 이벤트 식별자가 아닙니다."),
  name: z.string().trim().min(2, "이름은 2자 이상이어야 합니다.").max(50),
  gender: z.string().trim().max(20).optional(),
  level: z.string().trim().max(20).optional(),
  team: z.string().trim().max(30).optional(),
  seed: z.string().trim().optional(),
  note: z.string().trim().max(200).optional(),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type AddEventPlayerInput = z.infer<typeof addEventPlayerSchema>;
export type CreateEventPlayerInput = z.infer<typeof createEventPlayerSchema>;
