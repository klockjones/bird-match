import { deleteMatch, updateMatch } from "@/app/dashboard/[eventId]/matches/actions";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem } from "@/lib/types/match";
import type { EventPlayerItem } from "@/lib/types/player";
import { toKoreaLocalInputValue } from "@/lib/utils/format-date";
import { getMatchPlayerLabel } from "@/lib/utils/player-display";

type UpdateMatchFormProps = {
  event: EventDetailItem;
  match: MatchItem;
  participants: EventPlayerItem[];
};

function playerLabel(player: EventPlayerItem) {
  const team = player.team ?? null;
  return [getMatchPlayerLabel(player.player), player.player.level, team].filter(Boolean).join(" · ");
}

function slotValue(match: MatchItem, side: "A" | "B", position: number) {
  return match.match_players.find((slot) => slot.side === side && slot.position === position)?.player.id ?? "";
}

export function UpdateMatchForm({ event, match, participants }: UpdateMatchFormProps) {
  return (
    <div style={{ marginTop: 4, display: "grid", gap: 10 }}>
      <details className="admin-edit-panel">
        <summary>라운드·코트·선수 수정</summary>
        <form action={updateMatch} style={{ display: "grid", gap: 10 }}>
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="matchId" value={match.id} />
        <input type="hidden" name="publicUuid" value={event.public_uuid} />
        <input type="hidden" name="status" value={match.status} />
        <input type="hidden" name="team1Score" value={match.team1_score} />
        <input type="hidden" name="team2Score" value={match.team2_score} />
        <input type="hidden" name="winnerSide" value={match.winner_side ?? ""} />
        <input type="hidden" name="note" value={match.note ?? ""} />

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>라운드</span>
            <input name="roundName" defaultValue={match.round_name ?? ""} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>조</span>
            <input name="groupName" defaultValue={match.group_name ?? ""} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>경기 번호</span>
            <input name="matchNo" type="number" min="1" defaultValue={match.match_no} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>코트</span>
            <input name="courtNo" defaultValue={match.court_no ?? ""} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>정렬 순서</span>
            <input name="sortOrder" type="number" min="0" defaultValue={match.sort_order} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>예정 시간</span>
            <input
              name="scheduledAt"
              type="datetime-local"
              defaultValue={toKoreaLocalInputValue(match.scheduled_at)}
            />
          </label>
        </div>

        <div className="admin-sides-grid">
          <div className="admin-side-card">
            <span className="admin-side-label">A팀</span>
            <label style={{ display: "grid", gap: 6 }}>
              <span>선수 1</span>
              <select name="playerA1" defaultValue={slotValue(match, "A", 1)} required>
                <option value="" disabled>선수 선택</option>
                {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>선수 2</span>
              <select name="playerA2" defaultValue={slotValue(match, "A", 2)}>
                <option value="">없음(단식)</option>
                {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
              </select>
            </label>
          </div>
          <div className="admin-side-card">
            <span className="admin-side-label">B팀</span>
            <label style={{ display: "grid", gap: 6 }}>
              <span>선수 1</span>
              <select name="playerB1" defaultValue={slotValue(match, "B", 1)} required>
                <option value="" disabled>선수 선택</option>
                {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>선수 2</span>
              <select name="playerB2" defaultValue={slotValue(match, "B", 2)}>
                <option value="">없음(단식)</option>
                {participants.map((participant) => <option key={participant.id} value={participant.player.id}>{playerLabel(participant)}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div>
          <SubmitButton className="primary-button" pendingLabel="저장 중...">경기 정보 저장</SubmitButton>
        </div>
        </form>
      </details>

      <form action={deleteMatch} style={{ justifySelf: "start", paddingTop: 4, borderTop: "1px solid #f1f5f9" }}>
        <input type="hidden" name="eventId" value={event.id} />
        <input type="hidden" name="matchId" value={match.id} />
        <input type="hidden" name="publicUuid" value={event.public_uuid} />
        <HoldToConfirmButton
          className="danger-button"
          label="꾹 눌러서 삭제"
          holdingLabel="손을 떼면 취소돼요..."
          pendingLabel="삭제 중..."
        />
      </form>
    </div>
  );
}
