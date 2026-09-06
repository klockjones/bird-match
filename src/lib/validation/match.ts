import { z } from "zod";

const optionalUuid = z.union([z.literal(""), z.string().uuid()]).default("");

export const createMatchSchema = z
  .object({
    eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
    roundName: z.string().trim().max(50).optional(),
    groupName: z.string().trim().max(50).optional(),
    matchNo: z.coerce.number().int().positive("경기 번호는 1 이상이어야 합니다."),
    courtNo: z.string().trim().max(30).optional(),
    status: z.enum(["waiting", "done"]).default("waiting"),
    scheduledAt: z.string().trim().optional(),
    sortOrder: z.coerce.number().int().min(0, "정렬 순서는 0 이상이어야 합니다."),
    note: z.string().trim().max(200).optional(),
    playerA1: z.string().uuid("A팀 첫 번째 선수를 선택해주세요."),
    playerA2: optionalUuid,
    playerB1: z.string().uuid("B팀 첫 번째 선수를 선택해주세요."),
    playerB2: optionalUuid,
  })
  .superRefine((value, ctx) => {
    const ids = [value.playerA1, value.playerA2, value.playerB1, value.playerB2].filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["playerA1"],
        message: "같은 선수를 한 경기에서 중복 선택할 수 없습니다.",
      });
    }
  });

export const updateMatchScoreSchema = z.object({
  eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
  matchId: z.string().uuid("올바른 경기 식별자가 아닙니다."),
  team1Score: z.coerce.number().int().min(0, "점수는 0 이상이어야 합니다."),
  team2Score: z.coerce.number().int().min(0, "점수는 0 이상이어야 합니다."),
  note: z.string().trim().max(200).optional(),
});

export const updateMatchSchema = z
  .object({
    eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
    matchId: z.string().uuid("올바른 경기 식별자가 아닙니다."),
    roundName: z.string().trim().max(50).optional(),
    groupName: z.string().trim().max(50).optional(),
    matchNo: z.coerce.number().int().positive("경기 번호는 1 이상이어야 합니다."),
    courtNo: z.string().trim().max(30).optional(),
    status: z.enum(["waiting", "done"]),
    scheduledAt: z.string().trim().optional(),
    sortOrder: z.coerce.number().int().min(0, "정렬 순서는 0 이상이어야 합니다."),
    team1Score: z.coerce.number().int().min(0, "점수는 0 이상이어야 합니다."),
    team2Score: z.coerce.number().int().min(0, "점수는 0 이상이어야 합니다."),
    winnerSide: z.enum(["", "A", "B"]).default(""),
    note: z.string().trim().max(200).optional(),
    playerA1: z.string().uuid("A팀 첫 번째 선수를 선택해주세요."),
    playerA2: optionalUuid,
    playerB1: z.string().uuid("B팀 첫 번째 선수를 선택해주세요."),
    playerB2: optionalUuid,
  })
  .superRefine((value, ctx) => {
    const ids = [value.playerA1, value.playerA2, value.playerB1, value.playerB2].filter(Boolean);
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["playerA1"],
        message: "같은 선수를 한 경기에서 중복 선택할 수 없습니다.",
      });
    }

    if (value.status === "done") {
      if (!value.winnerSide) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["winnerSide"],
          message: "경기 종료 시 승자를 선택해주세요.",
        });
      }

      if (value.team1Score === value.team2Score) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["team1Score"],
          message: "종료된 경기는 동점일 수 없습니다.",
        });
      }
    }

    if (value.winnerSide === "A" && value.team1Score < value.team2Score) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["winnerSide"],
        message: "A팀 승자인데 점수가 더 낮습니다.",
      });
    }

    if (value.winnerSide === "B" && value.team2Score < value.team1Score) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["winnerSide"],
        message: "B팀 승자인데 점수가 더 낮습니다.",
      });
    }
  });

export const deleteMatchSchema = z.object({
  eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
  matchId: z.string().uuid("올바른 경기 식별자가 아닙니다."),
});

export const deleteAllMatchesSchema = z.object({
  eventId: z.string().uuid("올바른 일정 식별자가 아닙니다."),
});

export const generatedMatchSchema = z
  .object({
    matchNo: z.number().int().positive("경기 번호는 1 이상이어야 합니다."),
    sortOrder: z.number().int().min(0, "정렬 순서는 0 이상이어야 합니다."),
    roundName: z.string().trim().max(50).optional(),
    courtNo: z.string().trim().max(30).optional(),
    scheduledAt: z.string().trim().optional(),
    note: z.string().trim().max(200).optional(),
    playerA1: z.string().uuid(),
    playerA2: z.string().uuid(),
    playerB1: z.string().uuid(),
    playerB2: z.string().uuid(),
  })
  .superRefine((value, ctx) => {
    const ids = [value.playerA1, value.playerA2, value.playerB1, value.playerB2];
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["playerA1"],
        message: "같은 선수를 한 경기에서 중복 선택할 수 없습니다.",
      });
    }
  });

export const createGeneratedMatchesSchema = z.array(generatedMatchSchema).min(1, "생성된 경기가 없습니다.");

export type CreateMatchInput = z.infer<typeof createMatchSchema>;
export type UpdateMatchScoreInput = z.infer<typeof updateMatchScoreSchema>;
export type UpdateMatchInput = z.infer<typeof updateMatchSchema>;
export type DeleteMatchInput = z.infer<typeof deleteMatchSchema>;
export type DeleteAllMatchesInput = z.infer<typeof deleteAllMatchesSchema>;
export type GeneratedMatchInput = z.infer<typeof generatedMatchSchema>;
