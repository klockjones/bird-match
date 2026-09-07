import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlayerItem } from "@/lib/types/player";
import { getPlayerIdentity } from "@/lib/utils/player-display";

type RouteParams = {
  params: Promise<{ eventId: string }>;
};

type MatchPlayerRow = {
  side: "A" | "B";
  position: number;
  players: PlayerItem | PlayerItem[] | null;
};

type MatchRow = {
  id: string;
  round_name: string | null;
  group_name: string | null;
  match_no: number;
  court_no: string | null;
  status: string;
  team1_score: number;
  team2_score: number;
  winner_side: "A" | "B" | null;
  scheduled_at: string | null;
  sort_order: number;
  note: string | null;
  match_players: MatchPlayerRow[];
};

type EventPlayerTeamRow = {
  player_id: string;
  team: string | null;
};

export async function GET(_request: Request, { params }: RouteParams) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [{ data: event, error: eventError }, { data: matches, error: matchesError }, { data: eventPlayers }] = await Promise.all([
    supabase.from("events").select("id,title,event_date,public_uuid").eq("id", eventId).single(),
    supabase
      .from("matches")
      .select(
        "id,round_name,group_name,match_no,court_no,status,team1_score,team2_score,winner_side,scheduled_at,sort_order,note,match_players(side,position,players(id,name,gender,level,phone,memo,affiliation,english_id,national_level,regional_level,is_active,created_at))",
      )
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("match_no", { ascending: true }),
    supabase.from("event_players").select("player_id,team").eq("event_id", eventId),
  ]);

  if (eventError || !event) {
    return NextResponse.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });
  }

  if (matchesError) {
    return NextResponse.json({ error: matchesError.message }, { status: 500 });
  }

  const teamByPlayerId = new Map<string, string | null>();
  ((eventPlayers ?? []) as EventPlayerTeamRow[]).forEach((row) => teamByPlayerId.set(row.player_id, row.team));

  const backup = {
    event: { id: event.id, title: event.title, eventDate: event.event_date, publicUuid: event.public_uuid },
    generatedAt: new Date().toISOString(),
    matchCount: (matches ?? []).length,
    matches: ((matches ?? []) as MatchRow[]).map((match) => {
      const bySide = (side: "A" | "B") =>
        match.match_players
          .filter((slot) => slot.side === side)
          .sort((left, right) => left.position - right.position)
          .map((slot) => {
            const player = Array.isArray(slot.players) ? slot.players[0] : slot.players;
            if (!player) return null;
            return {
              identity: getPlayerIdentity(player),
              name: player.name,
              englishId: player.english_id,
              affiliation: player.affiliation,
              team: teamByPlayerId.get(player.id) || player.affiliation || null,
            };
          })
          .filter(Boolean);

      return {
        matchNo: match.match_no,
        roundName: match.round_name,
        groupName: match.group_name,
        courtNo: match.court_no,
        status: match.status,
        scheduledAt: match.scheduled_at,
        sortOrder: match.sort_order,
        note: match.note,
        team1Score: match.team1_score,
        team2Score: match.team2_score,
        winnerSide: match.winner_side,
        playersA: bySide("A"),
        playersB: bySide("B"),
      };
    }),
  };

  // Content-Disposition header values must be ASCII — Korean event titles need
  // the RFC 5987 filename* form (with an ASCII fallback) to download intact.
  const utf8FileName = `${event.title}_matches_backup.json`;

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="matches_backup.json"; filename*=UTF-8''${encodeURIComponent(utf8FileName)}`,
    },
  });
}
