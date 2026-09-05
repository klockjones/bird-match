import { createEvent } from "@/app/dashboard/actions";

export function CreateEventForm() {
  return (
    <form action={createEvent} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <div>
        <h2 style={{ margin: 0 }}>일정 생성</h2>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>공개 대진표와 운영 화면의 기준이 되는 일정을 먼저 만듭니다.</p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>일정명</span>
        <input name="title" required placeholder="예: 9월 청백전" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>일정 유형</span>
        <select name="eventType" defaultValue="general">
          <option value="general">일반전</option>
          <option value="blue_white">청백전</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>일정 날짜</span>
        <input name="eventDate" type="date" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>장소</span>
        <input name="location" placeholder="예: 다목적체육관" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>점수 규칙</span>
        <input name="scoringRule" defaultValue="match_win" required />
      </label>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>팀 이름 1</span>
          <input name="teamLabel1" defaultValue="어피치" placeholder="예: 어피치" />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>팀 이름 2</span>
          <input name="teamLabel2" defaultValue="라이언" placeholder="예: 라이언" />
        </label>
      </div>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input name="isPublic" type="checkbox" value="true" />
        <span>생성 후 공개 조회 허용</span>
      </label>

      <button type="submit">일정 생성</button>
    </form>
  );
}
