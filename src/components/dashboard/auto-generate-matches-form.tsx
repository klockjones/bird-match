"use client";

import { useState } from "react";
import { createGeneratedMatches } from "@/app/dashboard/[eventId]/matches/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem } from "@/lib/types/player";

type AutoGenerateMatchesFormProps = {
  event: EventDetailItem;
  participants: EventPlayerItem[];
  nextMatchNo: number;
  nextSortOrder: number;
};

type Team = {
  type: "남복" | "여복" | "혼복";
  players: [EventPlayerItem, EventPlayerItem];
};

type GeneratedMatch = {
  matchNo: number;
  sortOrder: number;
  courtNo: string;
  type: string;
  teamA: Team;
  teamB: Team;
};

function shuffle<T>(list: T[]): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function gradeSortedWithJitter(list: EventPlayerItem[]): EventPlayerItem[] {
  const groups = new Map<string, EventPlayerItem[]>();
  list.forEach((item) => {
    const key = item.player.regional_level ?? "";
    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  });

  return [...groups.keys()]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((key) => shuffle(groups.get(key) ?? []));
}

function formTeamsForRound(eligible: EventPlayerItem[]): Team[] {
  const men = gradeSortedWithJitter(eligible.filter((item) => item.player.gender === "남"));
  const women = gradeSortedWithJitter(eligible.filter((item) => item.player.gender === "여"));

  const teams: Team[] = [];
  const mixedCount = Math.min(men.length, women.length);

  for (let i = 0; i < mixedCount; i += 1) {
    teams.push({ type: "혼복", players: [men[i], women[i]] });
  }

  const remainingMen = men.slice(mixedCount);
  for (let i = 0; i + 1 < remainingMen.length; i += 2) {
    teams.push({ type: "남복", players: [remainingMen[i], remainingMen[i + 1]] });
  }

  const remainingWomen = women.slice(mixedCount);
  for (let i = 0; i + 1 < remainingWomen.length; i += 2) {
    teams.push({ type: "여복", players: [remainingWomen[i], remainingWomen[i + 1]] });
  }

  return teams;
}

function teamGradeKey(team: Team): string {
  return team.players[0].player.regional_level ?? "";
}

function formMatchesFromTeams(teams: Team[]): Array<{ teamA: Team; teamB: Team }> {
  const groups = new Map<string, Team[]>();
  teams.forEach((team) => {
    const key = teamGradeKey(team);
    const group = groups.get(key) ?? [];
    group.push(team);
    groups.set(key, group);
  });

  const ordered = [...groups.keys()]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((key) => shuffle(groups.get(key) ?? []));

  const matches: Array<{ teamA: Team; teamB: Team }> = [];
  for (let i = 0; i + 1 < ordered.length; i += 2) {
    matches.push({ teamA: ordered[i], teamB: ordered[i + 1] });
  }

  return matches;
}

function generateBracket(
  eligible: EventPlayerItem[],
  courtCount: number,
  totalGames: number,
  startMatchNo: number,
  startSortOrder: number,
): GeneratedMatch[] {
  const generated: GeneratedMatch[] = [];
  let safetyRounds = 0;

  while (generated.length < totalGames && safetyRounds < 200) {
    safetyRounds += 1;
    const teams = formTeamsForRound(eligible);
    if (teams.length < 2) break;

    const roundMatches = formMatchesFromTeams(teams);
    if (roundMatches.length === 0) break;

    for (const { teamA, teamB } of roundMatches) {
      if (generated.length >= totalGames) break;
      const index = generated.length;
      generated.push({
        matchNo: startMatchNo + index,
        sortOrder: startSortOrder + index,
        courtNo: `${(index % courtCount) + 1}코트`,
        type: teamA.type === teamB.type ? teamA.type : "혼합",
        teamA,
        teamB,
      });
    }
  }

  return generated;
}

function playerLabel(item: EventPlayerItem) {
  return [item.player.name, item.player.regional_level].filter(Boolean).join(" · ");
}

export function AutoGenerateMatchesForm({ event, participants, nextMatchNo, nextSortOrder }: AutoGenerateMatchesFormProps) {
  const [courtCount, setCourtCount] = useState(2);
  const [totalGames, setTotalGames] = useState(8);
  const [generated, setGenerated] = useState<GeneratedMatch[] | null>(null);

  const eligible = participants.filter((item) => item.player.gender && item.player.regional_level);
  const excluded = participants.filter((item) => !item.player.gender || !item.player.regional_level);

  function handleGenerate() {
    const next = generateBracket(eligible, Math.max(1, courtCount), Math.max(1, totalGames), nextMatchNo, nextSortOrder);
    setGenerated(next);
  }

  const payload = generated
    ? JSON.stringify(
        generated.map((match) => ({
          matchNo: match.matchNo,
          sortOrder: match.sortOrder,
          courtNo: match.courtNo,
          playerA1: match.teamA.players[0].player.id,
          playerA2: match.teamA.players[1].player.id,
          playerB1: match.teamB.players[0].player.id,
          playerB2: match.teamB.players[1].player.id,
        })),
      )
    : "";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
        <div>
          <h3 style={{ margin: 0 }}>1. 조건 입력</h3>
          <p style={{ margin: "8px 0 0", color: "#475569" }}>코트 개수와 총 경기 수를 입력하면 지역급수가 비슷한 참가자끼리 남복/혼복 대진표를 랜덤 생성합니다.</p>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>코트 개수</span>
            <input type="number" min="1" value={courtCount} onChange={(changeEvent) => setCourtCount(Number(changeEvent.target.value))} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>총 경기 수</span>
            <input type="number" min="1" value={totalGames} onChange={(changeEvent) => setTotalGames(Number(changeEvent.target.value))} />
          </label>
        </div>

        <div className="muted-text">참가 가능 인원: {eligible.length}명 (성별·지역급수가 등록된 참가자만 대상)</div>

        {excluded.length > 0 ? (
          <p className="admin-inline-message error" style={{ margin: 0 }}>
            제외된 참가자 ({excluded.length}명): {excluded.map((item) => item.player.name).join(", ")} — 성별 또는 지역급수 정보가 없습니다.
          </p>
        ) : null}

        <button type="button" className="primary-button" onClick={handleGenerate} disabled={eligible.length < 4}>
          {eligible.length < 4 ? "참가자가 부족합니다" : "대진표 생성"}
        </button>
      </div>

      {generated ? (
        <div style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>2. 미리보기</h3>

          {generated.length === 0 ? (
            <div className="empty-card">대진표를 만들 수 없습니다. 참가자 수를 확인해주세요.</div>
          ) : (
            <>
              {generated.length < totalGames ? (
                <p className="admin-inline-message error" style={{ margin: 0 }}>
                  참가자가 부족해 요청한 {totalGames}경기 중 {generated.length}경기만 생성되었습니다.
                </p>
              ) : null}

              <div className="admin-stack">
                {generated.map((match) => (
                  <article key={match.matchNo} className="admin-match-card">
                    <div className="admin-match-top">
                      <div>
                        <h3 className="admin-match-title">{match.matchNo} 경기</h3>
                        <p className="admin-match-subtitle">{match.courtNo} · {match.type}</p>
                      </div>
                    </div>
                    <div className="admin-sides-grid">
                      <div className="admin-side-card">
                        <span className="admin-side-label">A측 ({match.teamA.type})</span>
                        {match.teamA.players.map((item) => (
                          <div key={item.id} className="player-primary-text">{playerLabel(item)}</div>
                        ))}
                      </div>
                      <div className="admin-side-card">
                        <span className="admin-side-label">B측 ({match.teamB.type})</span>
                        {match.teamB.players.map((item) => (
                          <div key={item.id} className="player-primary-text">{playerLabel(item)}</div>
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" className="primary-button" onClick={handleGenerate}>다시 생성</button>
                <form action={createGeneratedMatches}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="matches" value={payload} />
                  <SubmitButton className="primary-button" pendingLabel="등록 중...">이대로 생성</SubmitButton>
                </form>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
