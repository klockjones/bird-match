"use client";

import { useState } from "react";
import { createGeneratedMatches } from "@/app/dashboard/[eventId]/matches/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import type { EventDetailItem } from "@/lib/types/event";
import type { EventPlayerItem } from "@/lib/types/player";
import { getEffectiveTeam, getMatchPlayerLabel } from "@/lib/utils/player-display";

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
  roundName: string;
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

function buildGradeRankMap(eligible: EventPlayerItem[]): Map<string, number> {
  const grades = [...new Set(eligible.map((item) => item.player.regional_level ?? ""))].sort((left, right) => left.localeCompare(right));
  return new Map(grades.map((grade, index) => [grade, index]));
}

function gradeDistance(a: EventPlayerItem, b: EventPlayerItem, rankMap: Map<string, number>): number {
  const rankA = rankMap.get(a.player.regional_level ?? "") ?? 0;
  const rankB = rankMap.get(b.player.regional_level ?? "") ?? 0;
  return Math.abs(rankA - rankB);
}

/**
 * Picks the best partner for `a` among `candidates`: always a different
 * 소속(회사) when at least one is available — the event is a 카카오/카페중
 * 친선전, so mixing companies is mandatory, not best-effort. Grade proximity
 * only breaks ties among different-company candidates. Falls back to the
 * closest grade overall only when every candidate is the same company as `a`.
 */
function pickPartnerIndex(a: EventPlayerItem, candidates: EventPlayerItem[], rankMap: Map<string, number>): number {
  const aTeam = getEffectiveTeam(a);
  let closestOverallIndex = 0;
  let closestOverallDistance = Infinity;
  let closestDifferentCompanyIndex = -1;
  let closestDifferentCompanyDistance = Infinity;

  candidates.forEach((candidate, index) => {
    const distance = gradeDistance(a, candidate, rankMap);
    if (distance < closestOverallDistance) {
      closestOverallDistance = distance;
      closestOverallIndex = index;
    }
    const candidateTeam = getEffectiveTeam(candidate);
    const differentCompany = !aTeam || !candidateTeam || candidateTeam !== aTeam;
    if (differentCompany && distance < closestDifferentCompanyDistance) {
      closestDifferentCompanyDistance = distance;
      closestDifferentCompanyIndex = index;
    }
  });

  return closestDifferentCompanyIndex >= 0 ? closestDifferentCompanyIndex : closestOverallIndex;
}

/**
 * Pairs entries from listA against listB using pickPartnerIndex for each,
 * searching the FULL remaining listB every time (not a grade-sliced subset)
 * so company diversity further down the grade order is never cut off before
 * the mixing search can reach it. Returns the pairs plus whatever's left
 * over on each side for same-gender pairing.
 */
function pairAcrossMixingCompanies(
  listA: EventPlayerItem[],
  listB: EventPlayerItem[],
  rankMap: Map<string, number>,
): { pairs: Array<[EventPlayerItem, EventPlayerItem]>; remainingA: EventPlayerItem[]; remainingB: EventPlayerItem[] } {
  const remainingA = [...listA];
  const remainingB = [...listB];
  const pairs: Array<[EventPlayerItem, EventPlayerItem]> = [];
  const count = Math.min(listA.length, listB.length);

  for (let i = 0; i < count; i += 1) {
    const a = remainingA.shift();
    if (!a) break;
    const bIndex = pickPartnerIndex(a, remainingB, rankMap);
    const [b] = remainingB.splice(bIndex, 1);
    pairs.push([a, b]);
  }

  return { pairs, remainingA, remainingB };
}

function playCountOf(item: EventPlayerItem, playCount: Map<string, number>): number {
  return playCount.get(item.player.id) ?? 0;
}

/** Index of the item with the highest play count so far — the fair choice to sit out when a list has an odd leftover. */
function pickSacrificeIndex(list: EventPlayerItem[], playCount: Map<string, number>): number {
  let worstIndex = 0;
  let worstValue = -Infinity;
  list.forEach((item, index) => {
    const value = playCountOf(item, playCount);
    if (value > worstValue) {
      worstValue = value;
      worstIndex = index;
    }
  });
  return worstIndex;
}

/**
 * Same grade-bounded company-mixing preference as pairAcrossMixingCompanies, but pairs entries
 * within a single list. If the list has an odd count, the person who has already played the most
 * matches so far sits out this round instead of whoever happens to be structurally last —
 * otherwise the same person can get skipped round after round purely by bad luck.
 */
function pairWithinMixingCompanies(list: EventPlayerItem[], rankMap: Map<string, number>, playCount: Map<string, number>): Array<[EventPlayerItem, EventPlayerItem]> {
  const remaining = [...list];
  if (remaining.length % 2 !== 0) {
    remaining.splice(pickSacrificeIndex(remaining, playCount), 1);
  }

  const pairs: Array<[EventPlayerItem, EventPlayerItem]> = [];

  while (remaining.length >= 2) {
    const a = remaining.shift();
    if (!a) break;
    const bIndex = pickPartnerIndex(a, remaining, rankMap);
    const [b] = remaining.splice(bIndex, 1);
    pairs.push([a, b]);
  }

  return pairs;
}

/**
 * Women normally outnumber men less often than the reverse, so cross-gender
 * mixing (count = min(men, women)) tends to pull every woman into a 혼복 pair,
 * leaving none for 여복. There aren't enough women to run this often, so the
 * whole bracket is capped at exactly one 여복 match: a small women's-doubles
 * reserve (the 2 lowest-grade women from each company, enough for two
 * company-mixed 여복 teams to face each other in a clean 2:2 match) is set
 * aside before mixing, but only while `slotOpen` is true (the caller flips
 * it off for good the moment one 여복 match actually lands). `force`
 * guarantees the attempt happens on the very first batch of a generation
 * run, so a full bracket isn't just unlucky and skips 여복 entirely. The
 * reserve is picked by company on purpose — a same-company tail slice would
 * often produce a 4:0 women's match instead of a mixed one, and the caller
 * drops the reserve back into general mixing if it doesn't come out 2:2
 * anyway. `women` is already grade-ascending (best grade first), so the
 * lowest-grade pick per company is the tail of its slice, not the head.
 */
function reserveWomenForDoubles(women: EventPlayerItem[], slotOpen: boolean, force: boolean): { womenForMixing: EventPlayerItem[]; reserved: EventPlayerItem[] } {
  if (!slotOpen || (!force && Math.random() >= 1 / 3)) {
    return { womenForMixing: women, reserved: [] };
  }

  const byCompany = new Map<string, EventPlayerItem[]>();
  women.forEach((item) => {
    const company = getEffectiveTeam(item) ?? "";
    const list = byCompany.get(company) ?? [];
    list.push(item);
    byCompany.set(company, list);
  });

  const eligibleCompanies = [...byCompany.entries()].filter(([, list]) => list.length >= 2);
  if (eligibleCompanies.length < 2) {
    return { womenForMixing: women, reserved: [] };
  }

  const [[, companyAWomen], [, companyBWomen]] = eligibleCompanies;
  const reserved = [...companyAWomen.slice(-2), ...companyBWomen.slice(-2)];
  const reservedIds = new Set(reserved.map((item) => item.id));
  const womenForMixing = women.filter((item) => !reservedIds.has(item.id));
  return { womenForMixing, reserved };
}

/** Higher-skill grade tiers where 남복 should be favored over 혼복 (weak bias, not exclusion). */
const HIGH_GRADE_TIERS = new Set(["B", "C", "D"]);

function isHighGradeMan(item: EventPlayerItem): boolean {
  return HIGH_GRADE_TIERS.has(item.player.regional_level ?? "");
}

/**
 * pairAcrossMixingCompanies always fills from the front of the list up to
 * count = min(men, women), so with men grouped strictly by grade every
 * round, the same low-grade men would always land inside that boundary
 * (always 혼복) and the same high-grade men would always fall past it
 * (always 남복) — nobody's match type varies across the whole bracket.
 * Reordering by how few 혼복 games each man has had so far (ties broken by
 * the existing grade-jitter order) makes the boundary move with history
 * instead of being grade-locked, so 혼복/남복 alternate for the same person
 * over multiple rounds. High-grade men (B/C/D) get a +1 handicap on top of
 * their actual 혼복 count — a soft push toward 남복, not a hard exclusion —
 * so they still land in 혼복 sometimes but noticeably less often than
 * similarly-experienced E-tier men.
 */
function menOrderedForMixingTurn(men: EventPlayerItem[], mixedCount: Map<string, number>): EventPlayerItem[] {
  const mixingPriorityScore = (item: EventPlayerItem) => playCountOf(item, mixedCount) + (isHighGradeMan(item) ? 1 : 0);
  return [...men].sort((a, b) => mixingPriorityScore(a) - mixingPriorityScore(b));
}

function formTeamsForRound(
  eligible: EventPlayerItem[],
  playCount: Map<string, number>,
  mixedCount: Map<string, number>,
  womensDoublesSlotOpen: boolean,
  forceWomensDoublesAttempt: boolean,
): Team[] {
  const rankMap = buildGradeRankMap(eligible);
  const men = menOrderedForMixingTurn(gradeSortedWithJitter(eligible.filter((item) => item.player.gender === "남")), mixedCount);
  const women = gradeSortedWithJitter(eligible.filter((item) => item.player.gender === "여"));
  const { womenForMixing, reserved } = reserveWomenForDoubles(women, womensDoublesSlotOpen, forceWomensDoublesAttempt);

  const teams: Team[] = [];
  const { pairs: mixedPairs, remainingA: remainingMen, remainingB: remainingWomen } = pairAcrossMixingCompanies(men, womenForMixing, rankMap);
  mixedPairs.forEach(([a, b]) => {
    teams.push({ type: "혼복", players: [a, b] });
  });

  pairWithinMixingCompanies(remainingMen, rankMap, playCount).forEach(([a, b]) => {
    teams.push({ type: "남복", players: [a, b] });
  });

  pairWithinMixingCompanies([...remainingWomen, ...reserved], rankMap, playCount).forEach(([a, b]) => {
    teams.push({ type: "여복", players: [a, b] });
  });

  return teams;
}

function teamGradeKey(team: Team): string {
  return team.players[0].player.regional_level ?? "";
}

function matchupKey(teamA: Team, teamB: Team): string {
  return [...teamA.players, ...teamB.players]
    .map((item) => item.player.id)
    .sort()
    .join("|");
}

/**
 * Scores a match's company balance across all 4 players: 0 = 2:2 (best —
 * either two 1:1-mixed teams, or a clean 카카오-team vs 카페중-team), 1 = 3:1
 * or 1:3 (acceptable), 2 = 4:0, everyone the same 소속(회사) (must be
 * avoided) — the event is a 카카오/카페중 친선전.
 */
function matchCompanyBalanceTier(teamA: Team, teamB: Team): number {
  const counts = new Map<string, number>();
  [...teamA.players, ...teamB.players].forEach((item) => {
    const company = getEffectiveTeam(item);
    if (!company) return;
    counts.set(company, (counts.get(company) ?? 0) + 1);
  });

  const values = [...counts.values()];
  if (values.length < 2) return 2;
  const maxCount = Math.max(...values);
  if (maxCount <= 2) return 0;
  if (maxCount === 3) return 1;
  return 2;
}

/**
 * Picks the best opponent for teamA among `remaining`, in priority order:
 * (1) fresh matchup + 2:2 company balance, (2) fresh matchup + at least not
 * 4:0, (3) repeat allowed + 2:2, (4) repeat allowed + at least not 4:0,
 * (5) whatever's left (closest in grade, since `remaining` is grade-sorted).
 */
function findOpponentIndex(teamA: Team, remaining: Team[], usedMatchupKeys: Set<string>): number {
  const passes: Array<(candidate: Team) => boolean> = [
    (candidate) => !usedMatchupKeys.has(matchupKey(teamA, candidate)) && matchCompanyBalanceTier(teamA, candidate) === 0,
    (candidate) => !usedMatchupKeys.has(matchupKey(teamA, candidate)) && matchCompanyBalanceTier(teamA, candidate) <= 1,
    (candidate) => matchCompanyBalanceTier(teamA, candidate) === 0,
    (candidate) => matchCompanyBalanceTier(teamA, candidate) <= 1,
  ];

  for (const passCheck of passes) {
    const index = remaining.findIndex(passCheck);
    if (index !== -1) return index;
  }

  return 0;
}

function isSingleCompanyTeam(team: Team): boolean {
  const companies = new Set(team.players.map((item) => getEffectiveTeam(item)).filter((value): value is string => Boolean(value)));
  return companies.size <= 1;
}

function teamPlayCount(team: Team, playCount: Map<string, number>): number {
  return team.players.reduce((sum, item) => sum + playCountOf(item, playCount), 0);
}

/**
 * Pairs adjacent (grade-proximate) teams into matches using findOpponentIndex
 * for each. Single-company (unmixed) teams are matched first, while the full
 * pool of balancing opponents is still available — already-mixed teams are
 * "flexible" (any opponent keeps their match balanced) and would otherwise
 * greedily consume the few opposite-company teams a later unmixed team needs
 * to avoid a 4:0 match. If there's an odd number of teams, the team whose
 * players have already played the most sits out this round instead of
 * whichever team happens to be structurally left over.
 */
function formMatchesFromTeams(teams: Team[], usedMatchupKeys: Set<string>, playCount: Map<string, number>): Array<{ teamA: Team; teamB: Team }> {
  const matches: Array<{ teamA: Team; teamB: Team }> = [];

  // 여복 teams only exist when the round's reserve explicitly set two of them aside — pair them
  // with each other directly, otherwise the general grade/company matching below (which ignores
  // team type) would almost always pit a 여복 team against a 혼복/남복 team instead. Still skip
  // forcing it when that specific pair would be a 4:0 (both teams the same company) — better to
  // fall back to the general pool than guarantee a company-balance violation.
  const womensDoublesTeams = teams.filter((team) => team.type === "여복");
  const pool = teams.filter((team) => team.type !== "여복");
  for (let i = 0; i + 1 < womensDoublesTeams.length; i += 2) {
    const teamA = womensDoublesTeams[i];
    const teamB = womensDoublesTeams[i + 1];
    if (matchCompanyBalanceTier(teamA, teamB) < 2) {
      matches.push({ teamA, teamB });
    } else {
      pool.push(teamA, teamB);
    }
  }
  if (womensDoublesTeams.length % 2 !== 0) {
    pool.push(womensDoublesTeams[womensDoublesTeams.length - 1]);
  }

  const groups = new Map<string, Team[]>();
  pool.forEach((team) => {
    const key = teamGradeKey(team);
    const group = groups.get(key) ?? [];
    group.push(team);
    groups.set(key, group);
  });

  const gradeSorted = [...groups.keys()]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((key) => shuffle(groups.get(key) ?? []));

  const remaining = [
    ...gradeSorted.filter((team) => isSingleCompanyTeam(team)),
    ...gradeSorted.filter((team) => !isSingleCompanyTeam(team)),
  ];

  if (remaining.length % 2 !== 0) {
    let worstIndex = 0;
    let worstValue = -Infinity;
    remaining.forEach((team, index) => {
      const value = teamPlayCount(team, playCount);
      if (value > worstValue) {
        worstValue = value;
        worstIndex = index;
      }
    });
    remaining.splice(worstIndex, 1);
  }

  while (remaining.length >= 2) {
    const teamA = remaining.shift();
    if (!teamA) break;

    const opponentIndex = findOpponentIndex(teamA, remaining, usedMatchupKeys);
    const [teamB] = remaining.splice(opponentIndex, 1);
    matches.push({ teamA, teamB });
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
  const usedMatchupKeys = new Set<string>();
  const playCount = new Map<string, number>(eligible.map((item) => [item.player.id, 0]));
  const mixedCount = new Map<string, number>(eligible.map((item) => [item.player.id, 0]));
  let safetyRounds = 0;
  let womensDoublesMatchesUsed = 0;

  while (generated.length < totalGames && safetyRounds < 200) {
    safetyRounds += 1;
    const womensDoublesSlotOpen = womensDoublesMatchesUsed < 1;
    const teams = formTeamsForRound(eligible, playCount, mixedCount, womensDoublesSlotOpen, safetyRounds === 1);
    if (teams.length < 2) break;

    const roundMatches = formMatchesFromTeams(teams, usedMatchupKeys, playCount);
    if (roundMatches.length === 0) break;

    for (const { teamA, teamB } of roundMatches) {
      if (generated.length >= totalGames) break;
      const index = generated.length;
      usedMatchupKeys.add(matchupKey(teamA, teamB));
      if (teamA.type === "여복" && teamB.type === "여복") {
        womensDoublesMatchesUsed += 1;
      }
      [teamA, teamB].forEach((team) => {
        if (team.type !== "혼복") return;
        team.players.forEach((item) => {
          mixedCount.set(item.player.id, playCountOf(item, mixedCount) + 1);
        });
      });
      [...teamA.players, ...teamB.players].forEach((item) => {
        playCount.set(item.player.id, playCountOf(item, playCount) + 1);
      });
      generated.push({
        matchNo: startMatchNo + index,
        sortOrder: startSortOrder + index,
        roundName: `${Math.floor(index / courtCount) + 1}R`,
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
  return [getMatchPlayerLabel(item.player), item.player.regional_level].filter(Boolean).join(" · ");
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
          roundName: match.roundName,
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
            제외된 참가자 ({excluded.length}명): {excluded.map((item) => getMatchPlayerLabel(item.player)).join(", ")} — 성별 또는 지역급수 정보가 없습니다.
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
                        <p className="admin-match-subtitle">{match.roundName} · {match.courtNo} · {match.type}</p>
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
