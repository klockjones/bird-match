import { updateEvent } from "@/app/dashboard/actions";
import type { EventDetailItem } from "@/lib/types/event";

type UpdateEventFormProps = {
  event: EventDetailItem;
};

export function UpdateEventForm({ event }: UpdateEventFormProps) {
  return (
    <form action={updateEvent} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <input type="hidden" name="eventId" value={event.id} />

      <div>
        <h2 style={{ margin: 0 }}>일정 기본 설정</h2>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>일정명, 날짜, 상태, 공개 여부를 여기서 관리합니다.</p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>일정명</span>
        <input name="title" required defaultValue={event.title} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>일정 유형</span>
        <select name="eventType" defaultValue={event.event_type}>
          <option value="general">일반전</option>
          <option value="blue_white">청백전</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
          <span>상태</span>
          <select name="status" defaultValue={event.status}>
          <option value="draft">준비 중</option>
          <option value="published">운영 중</option>
          <option value="closed">종료</option>
          </select>
        </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>일정 날짜</span>
        <input name="eventDate" type="date" defaultValue={event.event_date ?? ""} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>장소</span>
        <input name="location" defaultValue={event.location ?? ""} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>점수 규칙</span>
        <input name="scoringRule" required defaultValue={event.scoring_rule} />
      </label>

      <input type="hidden" name="teamLabel1" value={event.team_label_1 ?? ""} />
      <input type="hidden" name="teamLabel2" value={event.team_label_2 ?? ""} />

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input name="isPublic" type="checkbox" value="true" defaultChecked={event.is_public} />
        <span>공개 브래킷 페이지 열기</span>
      </label>

      <button type="submit">설정 저장</button>
    </form>
  );
}
