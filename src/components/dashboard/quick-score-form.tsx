import { updateMatchScore } from "@/app/dashboard/[eventId]/matches/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventDetailItem } from "@/lib/types/event";
import type { MatchItem } from "@/lib/types/match";

type QuickScoreFormProps = {
  event: EventDetailItem;
  match: MatchItem;
};

export function QuickScoreForm({ event, match }: QuickScoreFormProps) {
  return (
    <form action={updateMatchScore} className="admin-quick-score-form">
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="matchId" value={match.id} />
      <input type="hidden" name="publicUuid" value={event.public_uuid} />

      <select name="status" defaultValue={match.status}>
        <option value="waiting">대기</option>
        <option value="done">완료</option>
      </select>
      <div className="admin-quick-score-pair">
        <input name="team1Score" type="number" min="0" defaultValue={match.team1_score} required className="admin-quick-score-input" aria-label="A팀 점수" />
        <span aria-hidden>:</span>
        <input name="team2Score" type="number" min="0" defaultValue={match.team2_score} required className="admin-quick-score-input" aria-label="B팀 점수" />
      </div>
      <select name="winnerSide" defaultValue={match.winner_side ?? ""}>
        <option value="">승자 미정</option>
        <option value="A">A승</option>
        <option value="B">B승</option>
      </select>
      <input name="note" defaultValue={match.note ?? ""} placeholder="운영 메모" className="admin-quick-score-note" />
      <SubmitButton className="primary-button admin-quick-score-submit" pendingLabel="저장 중...">저장</SubmitButton>
    </form>
  );
}
