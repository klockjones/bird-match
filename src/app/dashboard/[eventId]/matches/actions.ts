"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { toKoreaTimestamp } from "@/lib/utils/format-date";
import { createGeneratedMatchesSchema, createMatchSchema, deleteAllMatchesSchema, deleteMatchSchema, updateMatchSchema, updateMatchScoreSchema } from "@/lib/validation/match";

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

async function validateEventPlayers(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, eventId: string, playerIds: string[], returnPath: string) {
  const { data: eventPlayers, error: eventPlayersError } = await supabase
    .from("event_players")
    .select("player_id")
    .eq("event_id", eventId)
    .in("player_id", playerIds);

  if (eventPlayersError) {
    redirect(`${returnPath}?error=${encodeURIComponent(eventPlayersError.message)}`);
  }

  if ((eventPlayers ?? []).length !== playerIds.length) {
    redirect(`${returnPath}?error=${encodeURIComponent("일정 참가자만 경기 선수로 배정할 수 있습니다.")}`);
  }
}

function buildSlots(values: {
  playerA1: string;
  playerA2: string;
  playerB1: string;
  playerB2: string;
}) {
  return [
    { playerId: values.playerA1, side: "A" as const, position: 1 },
    { playerId: values.playerA2, side: "A" as const, position: 2 },
    { playerId: values.playerB1, side: "B" as const, position: 1 },
    { playerId: values.playerB2, side: "B" as const, position: 2 },
  ].filter((slot): slot is { playerId: string; side: "A" | "B"; position: number } => Boolean(slot.playerId));
}

export async function createMatch(formData: FormData) {
  const { supabase } = await requireUser();

  const parsed = createMatchSchema.safeParse({
    eventId: formData.get("eventId"),
    roundName: formData.get("roundName"),
    groupName: formData.get("groupName"),
    matchNo: formData.get("matchNo"),
    courtNo: formData.get("courtNo"),
    status: formData.get("status") ?? "waiting",
    scheduledAt: formData.get("scheduledAt"),
    sortOrder: formData.get("sortOrder") ?? 0,
    note: formData.get("note"),
    playerA1: formData.get("playerA1"),
    playerA2: formData.get("playerA2") ?? "",
    playerB1: formData.get("playerB1"),
    playerB2: formData.get("playerB2") ?? "",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "경기 생성 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/matches/new?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const playerIds = [values.playerA1, values.playerA2, values.playerB1, values.playerB2].filter(Boolean);
  await validateEventPlayers(supabase, values.eventId, playerIds, `/dashboard/${values.eventId}/matches/new`);

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert({
      event_id: values.eventId,
      round_name: values.roundName || null,
      group_name: values.groupName || null,
      match_no: values.matchNo,
      court_no: values.courtNo || null,
      status: values.status,
      scheduled_at: values.scheduledAt ? toKoreaTimestamp(values.scheduledAt) : null,
      sort_order: values.sortOrder,
      note: values.note || null,
    })
    .select("id")
    .single();

  if (matchError || !match) {
    redirect(`/dashboard/${values.eventId}/matches/new?error=${encodeURIComponent(matchError?.message ?? "경기를 생성하지 못했습니다.")}`);
  }

  const { error: slotError } = await supabase.from("match_players").insert(
    buildSlots(values).map((slot) => ({
      match_id: match.id,
      player_id: slot.playerId,
      side: slot.side,
      position: slot.position,
    })),
  );

  if (slotError) {
    await supabase.from("matches").delete().eq("id", match.id);
    redirect(`/dashboard/${values.eventId}/matches/new?error=${encodeURIComponent(slotError.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/matches`);
  redirect(`/dashboard/${values.eventId}/matches/new?created=1&t=${Date.now()}`);
}

export async function updateMatch(formData: FormData) {
  const { supabase } = await requireUser();

  const parsed = updateMatchSchema.safeParse({
    eventId: formData.get("eventId"),
    matchId: formData.get("matchId"),
    roundName: formData.get("roundName"),
    groupName: formData.get("groupName"),
    matchNo: formData.get("matchNo"),
    courtNo: formData.get("courtNo"),
    status: formData.get("status"),
    scheduledAt: formData.get("scheduledAt"),
    sortOrder: formData.get("sortOrder"),
    team1Score: formData.get("team1Score"),
    team2Score: formData.get("team2Score"),
    winnerSide: formData.get("winnerSide") ?? "",
    note: formData.get("note"),
    playerA1: formData.get("playerA1"),
    playerA2: formData.get("playerA2") ?? "",
    playerB1: formData.get("playerB1"),
    playerB2: formData.get("playerB2") ?? "",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "경기 수정 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/matches?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const playerIds = [values.playerA1, values.playerA2, values.playerB1, values.playerB2].filter(Boolean);
  await validateEventPlayers(supabase, values.eventId, playerIds, `/dashboard/${values.eventId}/matches`);

  const nextWinnerSide = values.status === "done" ? values.winnerSide || null : null;
  const startedAt = values.status === "done" ? new Date().toISOString() : null;
  const endedAt = values.status === "done" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("matches")
    .update({
      round_name: values.roundName || null,
      group_name: values.groupName || null,
      match_no: values.matchNo,
      court_no: values.courtNo || null,
      status: values.status,
      scheduled_at: values.scheduledAt ? toKoreaTimestamp(values.scheduledAt) : null,
      sort_order: values.sortOrder,
      team1_score: values.team1Score,
      team2_score: values.team2Score,
      winner_side: nextWinnerSide,
      note: values.note || null,
      started_at: startedAt,
      ended_at: endedAt,
    })
    .eq("id", values.matchId)
    .eq("event_id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}/matches?error=${encodeURIComponent(error.message)}`);
  }

  const { error: deleteSlotsError } = await supabase.from("match_players").delete().eq("match_id", values.matchId);

  if (deleteSlotsError) {
    redirect(`/dashboard/${values.eventId}/matches?error=${encodeURIComponent(deleteSlotsError.message)}`);
  }

  const { error: insertSlotsError } = await supabase.from("match_players").insert(
    buildSlots(values).map((slot) => ({
      match_id: values.matchId,
      player_id: slot.playerId,
      side: slot.side,
      position: slot.position,
    })),
  );

  if (insertSlotsError) {
    redirect(`/dashboard/${values.eventId}/matches?error=${encodeURIComponent(insertSlotsError.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/matches`);
  revalidatePath(`/bracket/${formData.get("publicUuid") ?? ""}`);
  redirect(`/dashboard/${values.eventId}/matches?updated=1&t=${Date.now()}`);
}

export async function updateMatchScore(formData: FormData) {
  const { supabase } = await requireUser();

  const parsed = updateMatchScoreSchema.safeParse({
    eventId: formData.get("eventId"),
    matchId: formData.get("matchId"),
    team1Score: formData.get("team1Score"),
    team2Score: formData.get("team2Score"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "점수 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/matches?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  // A decisive score (badminton has no ties) means the match is over — status and winner
  // follow the score automatically instead of requiring a separate manual toggle.
  const isDecided = values.team1Score !== values.team2Score;
  const nextStatus = isDecided ? "done" : "waiting";
  const nextWinnerSide = isDecided ? (values.team1Score > values.team2Score ? "A" : "B") : null;
  const startedAt = isDecided ? new Date().toISOString() : null;
  const endedAt = isDecided ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("matches")
    .update({
      status: nextStatus,
      team1_score: values.team1Score,
      team2_score: values.team2Score,
      winner_side: nextWinnerSide,
      note: values.note || null,
      started_at: startedAt,
      ended_at: endedAt,
    })
    .eq("id", values.matchId)
    .eq("event_id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}/matches?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/matches`);
  revalidatePath(`/bracket/${formData.get("publicUuid") ?? ""}`);
  redirect(`/dashboard/${values.eventId}/matches?updated=1&t=${Date.now()}`);
}

export async function createGeneratedMatches(formData: FormData) {
  const { supabase } = await requireUser();

  const eventIdParsed = z.string().uuid("올바른 일정 식별자가 아닙니다.").safeParse(formData.get("eventId"));

  if (!eventIdParsed.success) {
    redirect(`/dashboard/${formData.get("eventId")}/matches/auto?error=${encodeURIComponent("올바른 일정 식별자가 아닙니다.")}`);
  }

  const eventId = eventIdParsed.data;
  const returnPath = `/dashboard/${eventId}/matches/auto`;

  let rawMatches: unknown;
  try {
    rawMatches = JSON.parse(String(formData.get("matches") ?? "[]"));
  } catch {
    redirect(`${returnPath}?error=${encodeURIComponent("생성된 대진표 데이터를 읽지 못했습니다.")}`);
  }

  const parsed = createGeneratedMatchesSchema.safeParse(rawMatches);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "생성된 대진표 데이터가 올바르지 않습니다.";
    redirect(`${returnPath}?error=${encodeURIComponent(message)}`);
  }

  const generatedMatches = parsed.data;
  const allPlayerIds = [...new Set(generatedMatches.flatMap((match) => [match.playerA1, match.playerA2, match.playerB1, match.playerB2]))];
  await validateEventPlayers(supabase, eventId, allPlayerIds, returnPath);

  const createdMatchIds: string[] = [];

  for (const generated of generatedMatches) {
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .insert({
        event_id: eventId,
        match_no: generated.matchNo,
        round_name: generated.roundName || null,
        court_no: generated.courtNo || null,
        scheduled_at: generated.scheduledAt ? toKoreaTimestamp(generated.scheduledAt) : null,
        status: "waiting",
        sort_order: generated.sortOrder,
        note: generated.note || null,
      })
      .select("id")
      .single();

    if (matchError || !match) {
      if (createdMatchIds.length > 0) {
        await supabase.from("matches").delete().in("id", createdMatchIds);
      }
      redirect(`${returnPath}?error=${encodeURIComponent(matchError?.message ?? "경기를 생성하지 못했습니다.")}`);
    }

    createdMatchIds.push(match.id);

    const { error: slotError } = await supabase.from("match_players").insert(
      buildSlots(generated).map((slot) => ({
        match_id: match.id,
        player_id: slot.playerId,
        side: slot.side,
        position: slot.position,
      })),
    );

    if (slotError) {
      await supabase.from("matches").delete().in("id", createdMatchIds);
      redirect(`${returnPath}?error=${encodeURIComponent(slotError.message)}`);
    }
  }

  revalidatePath(`/dashboard/${eventId}`);
  revalidatePath(`/dashboard/${eventId}/matches`);
  redirect(`/dashboard/${eventId}/matches?created=${createdMatchIds.length}&t=${Date.now()}`);
}

export async function deleteMatch(formData: FormData) {
  const { supabase } = await requireUser();

  const parsed = deleteMatchSchema.safeParse({
    eventId: formData.get("eventId"),
    matchId: formData.get("matchId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "경기 삭제 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/matches?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase.from("matches").delete().eq("id", values.matchId).eq("event_id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}/matches?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/matches`);
  revalidatePath(`/bracket/${formData.get("publicUuid") ?? ""}`);
  redirect(`/dashboard/${values.eventId}/matches?deleted=1&t=${Date.now()}`);
}

export async function deleteAllMatches(formData: FormData) {
  const { supabase } = await requireUser();

  const parsed = deleteAllMatchesSchema.safeParse({
    eventId: formData.get("eventId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "일괄 삭제 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/matches?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase.from("matches").delete().eq("event_id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}/matches?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/matches`);
  revalidatePath(`/bracket/${formData.get("publicUuid") ?? ""}`);
  redirect(`/dashboard/${values.eventId}/matches?deletedAll=1&t=${Date.now()}`);
}
