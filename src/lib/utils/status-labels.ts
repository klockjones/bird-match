import type { EventStatus } from "@/lib/types/event";
import type { MatchStatus } from "@/lib/types/match";

export function getMatchStatusLabel(status: MatchStatus) {
  if (status === "waiting") return "대기";
  if (status === "done") return "완료";
  return "대기";
}

export function getEventStatusLabel(status: EventStatus) {
  if (status === "draft") return "준비 중";
  if (status === "published") return "운영 중";
  return "종료";
}
