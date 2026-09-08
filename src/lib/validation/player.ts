import { z } from "zod";

export const createPlayerSchema = z
  .object({
    name: z.string().trim().max(50).optional(),
    gender: z.string().trim().max(20).optional(),
    level: z.string().trim().max(20).optional(),
    phone: z.string().trim().max(30).optional(),
    memo: z.string().trim().max(200).optional(),
    affiliation: z.string().trim().max(50).optional(),
    englishId: z.string().trim().max(50).optional(),
    nationalLevel: z.string().trim().max(20).optional(),
    regionalLevel: z.string().trim().max(20).optional(),
    isActive: z.enum(["true", "false"]).default("true"),
  })
  .superRefine((value, ctx) => {
    if (!value.name && !value.englishId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "이름 또는 영문ID 중 하나는 필요합니다.",
      });
    }
  });

export const removeEventPlayerSchema = z.object({
  eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
  participantId: z.string().uuid("올바른 참가자 식별자가 아닙니다."),
});

export const editEventPlayerSchema = z.object({
  eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
  participantId: z.string().uuid("올바른 참가자 식별자가 아닙니다."),
  team: z.string().trim().max(30).optional(),
  seed: z.string().trim().optional(),
  note: z.string().trim().max(200).optional(),
});

export const deletePlayerSchema = z.object({
  playerId: z.string().uuid("올바른 선수 식별자가 아닙니다."),
});

export const setPlayerActiveSchema = z.object({
  playerId: z.string().uuid("올바른 선수 식별자가 아닙니다."),
  isActive: z.enum(["true", "false"]),
});

export const createEventPlayerSchema = z
  .object({
    eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
    name: z.string().trim().max(50).optional(),
    gender: z.string().trim().max(20).optional(),
    level: z.string().trim().max(20).optional(),
    affiliation: z.string().trim().max(50).optional(),
    englishId: z.string().trim().max(50).optional(),
    nationalLevel: z.string().trim().max(20).optional(),
    regionalLevel: z.string().trim().max(20).optional(),
    team: z.string().trim().max(30).optional(),
    seed: z.string().trim().optional(),
    note: z.string().trim().max(200).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.name && !value.englishId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["name"],
        message: "이름 또는 영문ID 중 하나는 필요합니다.",
      });
    }
  });

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
export type RemoveEventPlayerInput = z.infer<typeof removeEventPlayerSchema>;
export type CreateEventPlayerInput = z.infer<typeof createEventPlayerSchema>;
export type EditEventPlayerInput = z.infer<typeof editEventPlayerSchema>;
export type DeletePlayerInput = z.infer<typeof deletePlayerSchema>;
export type SetPlayerActiveInput = z.infer<typeof setPlayerActiveSchema>;
