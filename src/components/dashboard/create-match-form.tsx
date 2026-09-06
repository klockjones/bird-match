import { createMatch } from "@/app/dashboard/[eventId]/matches/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem } from "@/lib/types/player";
import { getMatchPlayerLabel } from "@/lib/utils/player-display";

type CreateMatchFormProps = {
  event: EventDetailItem;
  participants: EventPlayerItem[];
  nextMatchNo: number;
  nextSortOrder: number;
};

function playerLabel(player: EventPlayerItem) {
  const team = player.team ?? null;
  return [getMatchPlayerLabel(player.player), player.player.level, team].filter(Boolean).join(" · ");
}

export function CreateMatchForm({ event, participants, nextMatchNo, nextSortOrder }: CreateMatchFormProps) {
  return (
    <form action={createMatch} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <input type="hidden" name="eventId" value={event.id} />

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
          <input name="matchNo" type="number" min="1" defaultValue={nextMatchNo} required />
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
          <input name="sortOrder" type="number" min="0" defaultValue={nextSortOrder} required />
        </label>
      </div>

      <div className="admin-sides-grid">
        <div className="admin-side-card">
          <span className="admin-side-label">A팀</span>
          <label style={{ display: "grid", gap: 6 }}>
            <span>선수 1</span>
            <select name="playerA1" defaultValue="" required>
              <option value="" disabled>선수 선택</option>
              {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>선수 2</span>
            <select name="playerA2" defaultValue="">
              <option value="">없음 (단식 경기)</option>
              {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
            </select>
          </label>
        </div>
        <div className="admin-side-card">
          <span className="admin-side-label">B팀</span>
          <label style={{ display: "grid", gap: 6 }}>
            <span>선수 1</span>
            <select name="playerB1" defaultValue="" required>
              <option value="" disabled>선수 선택</option>
              {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>선수 2</span>
            <select name="playerB2" defaultValue="">
              <option value="">없음 (단식 경기)</option>
              {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
            </select>
          </label>
        </div>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>메모</span>
        <input name="note" placeholder="예: 메인 코트 우선 배정" />
      </label>

      <SubmitButton className="primary-button" pendingLabel="생성 중..." disabled={participants.length < 2}>
        {participants.length < 2 ? "참가자가 부족합니다" : "경기 생성"}
      </SubmitButton>
    </form>
  );
}
