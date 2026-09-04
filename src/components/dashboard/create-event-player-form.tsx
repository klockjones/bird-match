import { createEventPlayer } from "@/app/dashboard/[eventId]/players/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventDetailItem } from "@/lib/types/event";

type CreateEventPlayerFormProps = {
  event: EventDetailItem;
  teamOptions: string[];
};

export function CreateEventPlayerForm({ event, teamOptions }: CreateEventPlayerFormProps) {
  const teamLabel1 = event.team_label_1 ?? "팀 1";
  const teamLabel2 = event.team_label_2 ?? "팀 2";
  const teamSuggestions = [...new Set([event.team_label_1, event.team_label_2, ...teamOptions].filter((value): value is string => Boolean(value)))];

  return (
    <form action={createEventPlayer} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <input type="hidden" name="eventId" value={event.id} />

      <div>
        <h3 style={{ margin: 0 }}>새 선수 등록하며 추가</h3>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>선수 마스터에 없는 사람을 바로 등록하면서 이 이벤트에 추가합니다.</p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>이름</span>
        <input name="name" required placeholder="예: 김철수" />
      </label>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>성별/구분</span>
          <select name="gender" defaultValue="">
            <option value="">선택 안 함</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>급수/레벨</span>
          <input name="level" placeholder="예: A조" />
        </label>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>팀</span>
          <input name="team" list="team-options-create" placeholder={event.event_type === "blue_white" ? `${teamLabel1} / ${teamLabel2}` : "예: 어피치"} />
          <datalist id="team-options-create">
            {teamSuggestions.map((team) => <option key={team} value={team} />)}
          </datalist>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>시드</span>
          <input name="seed" type="number" min="1" placeholder="예: 1" />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>메모</span>
        <input name="note" placeholder="예: 당일 접수, 대기조" />
      </label>

      <SubmitButton className="primary-button" pendingLabel="등록 중...">참가자로 등록</SubmitButton>
    </form>
  );
}
