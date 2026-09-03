import { createMatch } from "@/app/dashboard/[eventId]/matches/actions";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem } from "@/lib/types/player";

type CreateMatchFormProps = {
  event: EventDetailItem;
  participants: EventPlayerItem[];
};

function playerLabel(player: EventPlayerItem) {
  const team = player.team ?? null;
  return [player.player.name, player.player.level, team].filter(Boolean).join(" · ");
}

export function CreateMatchForm({ event, participants }: CreateMatchFormProps) {
  return (
    <form action={createMatch} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <input type="hidden" name="eventId" value={event.id} />

      <div>
        <h2 style={{ margin: 0 }}>경기 생성</h2>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>이벤트 참가자를 기준으로 경기 순서와 코트를 등록합니다.</p>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>라운드</span>
          <input name="roundName" placeholder="예: 예선 1R" />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>조</span>
          <input name="groupName" placeholder="예: A조" />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>경기 번호</span>
          <input name="matchNo" type="number" min="1" required />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>코트</span>
          <input name="courtNo" placeholder="예: 1코트" />
        </label>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>상태</span>
          <select name="status" defaultValue="waiting">
            <option value="waiting">대기</option>
            <option value="done">완료</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>예정 시간</span>
          <input name="scheduledAt" type="datetime-local" />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>정렬 순서</span>
          <input name="sortOrder" type="number" min="0" defaultValue={0} required />
        </label>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>A팀 선수 1</span>
          <select name="playerA1" defaultValue="" required>
            <option value="" disabled>선수 선택</option>
            {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>A팀 선수 2</span>
          <select name="playerA2" defaultValue="">
            <option value="">없음(단식)</option>
            {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>B팀 선수 1</span>
          <select name="playerB1" defaultValue="" required>
            <option value="" disabled>선수 선택</option>
            {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>B팀 선수 2</span>
          <select name="playerB2" defaultValue="">
            <option value="">없음(단식)</option>
            {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
          </select>
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>메모</span>
        <input name="note" placeholder="예: 메인 코트 우선 배정" />
      </label>

      <button type="submit" disabled={participants.length < 2}>{participants.length < 2 ? "참가자가 부족합니다" : "경기 생성"}</button>
    </form>
  );
}
