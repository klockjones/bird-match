import { z } from "zod";

export const assignEventStaffSchema = z.object({
  eventId: z.string().uuid("올바른 이벤트 식별자가 아닙니다."),
  userId: z.string().uuid("운영진 사용자를 선택해주세요."),
  role: z.enum(["staff", "viewer"]),
});

export const updateEventStaffRoleSchema = z.object({
  eventId: z.string().uuid("올바른 이벤트 식별자가 아닙니다."),
  staffId: z.string().uuid("올바른 운영진 식별자가 아닙니다."),
  role: z.enum(["staff", "viewer"]),
});

export const removeEventStaffSchema = z.object({
  eventId: z.string().uuid("올바른 이벤트 식별자가 아닙니다."),
  staffId: z.string().uuid("올바른 운영진 식별자가 아닙니다."),
});
