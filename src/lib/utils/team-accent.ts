import type { CSSProperties } from "react";

type TeamAccentStyle = CSSProperties & {
  ["--team-dot-bg"]?: string;
  ["--team-dot-ring"]?: string;
};

const TEAM_PALETTE = [
  { bg: "#fdba74", ring: "rgba(253, 186, 116, 0.12)" },
  { bg: "#93c5fd", ring: "rgba(147, 197, 253, 0.12)" },
  { bg: "#a7f3d0", ring: "rgba(167, 243, 208, 0.12)" },
  { bg: "#f9a8d4", ring: "rgba(249, 168, 212, 0.12)" },
  { bg: "#c4b5fd", ring: "rgba(196, 181, 253, 0.12)" },
  { bg: "#fcd34d", ring: "rgba(252, 211, 77, 0.12)" },
];

function hashTeamName(team: string) {
  let hash = 0;
  for (let index = 0; index < team.length; index += 1) {
    hash = (hash * 31 + team.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getTeamAccentStyle(team: string | null | undefined): TeamAccentStyle | undefined {
  if (!team) return undefined;
  const palette = TEAM_PALETTE[hashTeamName(team) % TEAM_PALETTE.length];

  return {
    "--team-dot-bg": palette.bg,
    "--team-dot-ring": palette.ring,
  };
}
