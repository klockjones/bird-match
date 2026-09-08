import type { PlayerItem } from "@/lib/types/player";

export type MatchStatus = "waiting" | "done" | "cancelled";
export type MatchSide = "A" | "B";

export type MatchPlayerSlot = {
  side: MatchSide;
  position: number;
  player: PlayerItem;
};

export type MatchItem = {
  id: string;
  event_id: string;
  round_name: string | null;
  group_name: string | null;
  match_no: number;
  court_no: string | null;
  status: MatchStatus;
  team1_score: number;
  team2_score: number;
  winner_side: MatchSide | null;
  scheduled_at: string | null;
  sort_order: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  match_players: MatchPlayerSlot[];
};
