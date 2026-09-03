import { addEventPlayer } from "@/app/dashboard/[eventId]/players/actions";
import type { EventDetailItem } from "@/lib/types/event";
import type { PlayerItem } from "@/lib/types/player";

type AddEventPlayerFormProps = {
  event: EventDetailItem;
  players: PlayerItem[];
};

export function AddEventPlayerForm({ event, players }: AddEventPlayerFormProps) {
  const teamLabel1 = event.team_label_1 ?? "팀 1";
  const teamLabel2 = event.team_label_2 ?? "팀 2";

  return (
    <form action={addEventPlayer} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <input type="hidden" name="eventId" value={event.id} />

      <div>
        <h2 style={{ margin: 0 }}>이벤트 참가자 추가</h2>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>
          {event.event_type === "blue_white" ? `${teamLabel1}/${teamLabel2} 팀을 함께 지정해 참가자를 묶습니다.` : "일반전은 팀 없이 참가자만 연결하면 됩니다."}
        </p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>선수 선택</span>
        <select name="playerId" defaultValue="" required>
          <option value="" disabled>
            선수 선택
          </option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}{player.level ? ` · ${player.level}` : ""}
            </option>
          ))}
        </select>
      </label>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>팀</span>
          <select name="team" defaultValue="">
            <option value="">지정 안 함</option>
            {event.event_type === "blue_white" ? (
              <>
                <option value={teamLabel1}>{teamLabel1}</option>
                <option value={teamLabel2}>{teamLabel2}</option>
              </>
            ) : null}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>시드</span>
          <input name="seed" type="number" min="1" placeholder="예: 1" />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>메모</span>
        <input name="note" placeholder="예: 조장, 대기조" />
      </label>

      <button type="submit" disabled={players.length === 0}>
        {players.length === 0 ? "추가할 선수 없음" : "참가자 추가"}
      </button>
    </form>
  );
}
