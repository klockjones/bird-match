import { addEventPlayer } from "@/app/dashboard/[eventId]/players/actions";
import type { EventDetailItem } from "@/lib/types/event";
import type { PlayerItem } from "@/lib/types/player";

type AddEventPlayerFormProps = {
  event: EventDetailItem;
  players: PlayerItem[];
  teamOptions: string[];
};

export function AddEventPlayerForm({ event, players, teamOptions }: AddEventPlayerFormProps) {
  const teamLabel1 = event.team_label_1 ?? "팀 1";
  const teamLabel2 = event.team_label_2 ?? "팀 2";
  const teamSuggestions = [...new Set([event.team_label_1, event.team_label_2, ...teamOptions].filter((value): value is string => Boolean(value)))];

  return (
    <form action={addEventPlayer} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <input type="hidden" name="eventId" value={event.id} />

      <div>
        <h3 style={{ margin: 0 }}>기존 선수 연결</h3>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>
          {event.event_type === "blue_white" ? `${teamLabel1}/${teamLabel2} 팀을 함께 지정해 참가자를 묶습니다.` : "일반전은 팀 없이 참가자만 연결하면 됩니다."}
        </p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>선수 선택</span>
        <select name="playerId" defaultValue="" required disabled={players.length === 0}>
          <option value="" disabled>
            선수 선택
          </option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>
              {player.name}{player.level ? ` · ${player.level}` : ""}
            </option>
          ))}
        </select>
        {players.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>선수 마스터에 있는 인원이 모두 이 일정에 연결되어 있습니다. 새 사람은 옆의 &quot;새 선수 등록하며 추가&quot;를 이용하세요.</p>
        ) : null}
      </label>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>팀</span>
          <input name="team" list="team-options-select" placeholder={event.event_type === "blue_white" ? `${teamLabel1} / ${teamLabel2}` : "예: 어피치"} />
          <datalist id="team-options-select">
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
        <input name="note" placeholder="예: 조장, 대기조" />
      </label>

      <button type="submit" disabled={players.length === 0}>
        {players.length === 0 ? "연결할 선수 없음" : "선수 연결하기"}
      </button>
    </form>
  );
}
