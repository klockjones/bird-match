import type { EventPlayerItem, PlayerItem } from "@/lib/types/player";

/**
 * A player may be identified by LDAP or by name depending on the event
 * (some events collect only 소속+LDAP, others 소속+이름) — prefer LDAP when
 * present, fall back to name, and pair either with affiliation when available.
 */
export function getMatchPlayerLabel(player: PlayerItem) {
  const identity = player.english_id || player.name;

  if (player.affiliation && identity) {
    return `${player.affiliation} · ${identity}`;
  }

  return identity || player.affiliation || "이름 미정";
}

/** Identity only (no affiliation prefix) — for layouts that show affiliation as its own separate line/chip. */
export function getPlayerIdentity(player: PlayerItem) {
  return player.english_id || player.name || "이름 미정";
}

export function getEffectiveTeam(item: EventPlayerItem): string | null {
  return item.team || item.player.affiliation || null;
}

/**
 * Participant lists are fetched newest-first so late/추가 등록 참가자 show up first —
 * good for review screens, but it scatters players across team/name when picking
 * them for a match. Sort by team then identity so the selection dropdowns stay
 * predictable regardless of when a participant was added.
 */
export function sortParticipantsByTeamAndName(participants: EventPlayerItem[]): EventPlayerItem[] {
  return [...participants].sort((left, right) => {
    const teamCompare = (getEffectiveTeam(left) ?? "").localeCompare(getEffectiveTeam(right) ?? "");
    if (teamCompare !== 0) return teamCompare;
    return getPlayerIdentity(left.player).localeCompare(getPlayerIdentity(right.player));
  });
}

/** Derives 남복/여복/혼복 from the actual players on a side — not stored on the match, so it always reflects reality even for manually created/edited matches. */
export function getDoublesTypeLabel(players: Array<{ gender: string | null }>): string {
  const genders = new Set(players.map((player) => player.gender).filter((value): value is string => Boolean(value)));

  if (genders.size === 0) return "복식조";
  if (genders.size > 1) return "혼복";

  const [gender] = genders;
  if (gender === "여") return "여복";
  if (gender === "남") return "남복";
  return "복식조";
}
