import { z } from "zod";

const eventSchemaBase = z.object({
  title: z.string().trim().min(2, "이벤트명은 2자 이상이어야 합니다.").max(100),
  eventType: z.enum(["general", "blue_white"]),
  eventDate: z.string().trim().optional(),
  location: z.string().trim().max(100).optional(),
  isPublic: z.enum(["true", "false"]).default("false"),
  scoringRule: z.string().trim().min(2, "점수 규칙을 입력해주세요.").max(50),
  teamLabel1: z.string().trim().max(30).optional(),
  teamLabel2: z.string().trim().max(30).optional(),
});

function applyTeamLabelValidation<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value: z.infer<typeof eventSchemaBase>, ctx) => {
  if (value.eventType === "blue_white") {
    if (!value.teamLabel1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["teamLabel1"], message: "청백전 첫 번째 팀 이름을 입력해주세요." });
    }
    if (!value.teamLabel2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["teamLabel2"], message: "청백전 두 번째 팀 이름을 입력해주세요." });
    }
  }
  });
}

export const createEventSchema = applyTeamLabelValidation(eventSchemaBase);

export const updateEventSchema = applyTeamLabelValidation(eventSchemaBase.extend({
  eventId: z.string().uuid("올바른 이벤트 식별자가 아닙니다."),
  status: z.enum(["draft", "published", "closed"]),
}));

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
