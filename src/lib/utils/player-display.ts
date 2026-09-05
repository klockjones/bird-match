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

export function getEffectiveTeam(item: EventPlayerItem): string | null {
  return item.team || item.player.affiliation || null;
}
