"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readUploadedSheet } from "@/lib/imports/csv";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { matchImportRowSchema, playerImportRowSchema } from "@/lib/validation/import";

type SpreadsheetRow = Record<string, string>;

type EventPlayerNameRow = {
  player_id: string;
  players: { name: string } | { name: string }[] | null;
};

type MatchImportSlot = {
  playerName: string;
  side: "A" | "B";
  position: number;
};

type ImportErrorRow = {
  rowNumber: number;
  message: string;
  row?: unknown;
};

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

async function logImport({
  supabase,
  eventId,
  importType,
  fileName,
  rowCount,
  successCount,
  failCount,
  rawSnapshot,
  uploadedBy,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  eventId: string;
  importType: "players" | "matches";
  fileName: string;
  rowCount: number;
  successCount: number;
  failCount: number;
  rawSnapshot: unknown;
  uploadedBy: string;
}) {
  const { data } = await supabase.from("imports").insert({
    event_id: eventId,
    import_type: importType,
    file_name: fileName,
    row_count: rowCount,
    success_count: successCount,
    fail_count: failCount,
    raw_snapshot: rawSnapshot,
    uploaded_by: uploadedBy,
  }).select("id").single();

  return data?.id as string | undefined;
}

async function logImportFailureAndRedirect({
  supabase,
  eventId,
  importType,
  fileName,
  rowCount,
  uploadedBy,
  summary,
  errors,
  rows,
}: {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  eventId: string;
  importType: "players" | "matches";
  fileName: string;
  rowCount: number;
  uploadedBy: string;
  summary: string;
  errors: ImportErrorRow[];
  rows: unknown[];
}) {
  const importId = await logImport({
    supabase,
    eventId,
    importType,
    fileName,
    rowCount,
    successCount: 0,
    failCount: errors.length || rowCount,
    rawSnapshot: {
      status: "failed",
      summary,
      errors,
      previewRows: rows.slice(0, 5),
    },
    uploadedBy,
  });

  redirect(
    `/dashboard/${eventId}/imports?error=${encodeURIComponent(summary)}${importId ? `&errorImport=${importId}` : ""}`,
  );
}

export async function importPlayersCsv(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const { supabase, user } = await requireUser();

  let fileName = "players.csv";

  try {
    const uploaded = await readUploadedSheet(formData.get("file"));
    fileName = uploaded.name;
    const rows: SpreadsheetRow[] = uploaded.rows;

    if (rows.length === 0) {
      await logImportFailureAndRedirect({
        supabase,
        eventId,
        importType: "players",
        fileName,
        rowCount: 0,
        uploadedBy: user.id,
        summary: "업로드 데이터가 비어 있습니다.",
        errors: [{ rowNumber: 0, message: "행 데이터가 없습니다." }],
        rows: [],
      });
    }

    const normalizedRows = rows.map((row: SpreadsheetRow) => ({
      name: row.name ?? row.Name ?? "",
      gender: row.gender ?? row.Gender ?? "",
      level: row.level ?? row.Level ?? "",
      phone: row.phone ?? row.Phone ?? "",
      memo: row.memo ?? row.Memo ?? "",
      affiliation: row.affiliation ?? row.Affiliation ?? "",
      english_id: row.english_id ?? row.englishId ?? row.EnglishId ?? "",
      national_level: row.national_level ?? row.nationalLevel ?? row.NationalLevel ?? "",
      regional_level: row.regional_level ?? row.regionalLevel ?? row.RegionalLevel ?? "",
      team: row.team ?? row.Team ?? "",
      seed: row.seed ?? row.Seed ?? "",
    }));

    const parseResults = normalizedRows.map((row) => playerImportRowSchema.safeParse(row));
    const invalid = parseResults.filter((result) => !result.success);

    if (invalid.length > 0) {
      const errors = parseResults.flatMap((result, index) =>
        result.success
          ? []
          : [{ rowNumber: index + 2, message: result.error.issues[0]?.message ?? "명단 파일 형식이 올바르지 않습니다.", row: normalizedRows[index] }],
      );
      await logImportFailureAndRedirect({
        supabase,
        eventId,
        importType: "players",
        fileName,
        rowCount: normalizedRows.length,
        uploadedBy: user.id,
        summary: errors[0]?.message ?? "명단 파일 형식이 올바르지 않습니다.",
        errors,
        rows: normalizedRows,
      });
    }

    const validRows = parseResults
      .map((result) => (result.success ? result.data : null))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const names = [...new Set(validRows.map((row) => row.name))];

    const { data: existingPlayers, error: playersError } = await supabase
      .from("players")
      .select("id,name")
      .in("name", names);

    if (playersError) {
      redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(playersError.message)}`);
    }

    const playerByName = new Map((existingPlayers ?? []).map((player) => [player.name, player.id]));
    const missingPlayers = validRows.filter((row) => !playerByName.has(row.name));

    if (missingPlayers.length > 0) {
      const { data: insertedPlayers, error: insertPlayersError } = await supabase
        .from("players")
        .insert(
          missingPlayers.map((row) => ({
            name: row.name,
            gender: row.gender || null,
            level: row.level || null,
            phone: row.phone || null,
            memo: row.memo || null,
            affiliation: row.affiliation || null,
            english_id: row.english_id || null,
            national_level: row.national_level || null,
            regional_level: row.regional_level || null,
            is_active: true,
          })),
        )
        .select("id,name");

      if (insertPlayersError) {
        redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(insertPlayersError.message)}`);
      }

      (insertedPlayers ?? []).forEach((player) => playerByName.set(player.name, player.id));
    }

    const { data: existingEventPlayers, error: eventPlayersError } = await supabase
      .from("event_players")
      .select("player_id")
      .eq("event_id", eventId);

    if (eventPlayersError) {
      redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(eventPlayersError.message)}`);
    }

    const existingIds = new Set((existingEventPlayers ?? []).map((row) => row.player_id));
    const toInsert = validRows
      .map((row) => {
        const playerId = playerByName.get(row.name);
        if (!playerId || existingIds.has(playerId)) return null;
        const seed = row.seed ? Number(row.seed) : null;
        return {
          event_id: eventId,
          player_id: playerId,
          team: row.team || null,
          seed: row.seed && !Number.isNaN(seed) ? seed : null,
          note: row.memo || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (toInsert.length > 0) {
      const { error: insertEventPlayersError } = await supabase.from("event_players").insert(toInsert);
      if (insertEventPlayersError) {
        redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(insertEventPlayersError.message)}`);
      }
    }

    const successCount = toInsert.length;
    const failCount = validRows.length - successCount;

    await logImport({
      supabase,
      eventId,
      importType: "players",
      fileName,
      rowCount: validRows.length,
      successCount,
      failCount,
      rawSnapshot: validRows,
      uploadedBy: user.id,
    });

    revalidatePath(`/dashboard/${eventId}`);
    revalidatePath(`/dashboard/${eventId}/players`);
    revalidatePath(`/dashboard/${eventId}/imports`);
    redirect(`/dashboard/${eventId}/imports?playerImported=${successCount}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "명단 업로드에 실패했습니다.";
    redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(message)}`);
  }
}

export async function importMatchesCsv(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  const { supabase, user } = await requireUser();

  let fileName = "matches.csv";

  try {
    const uploaded = await readUploadedSheet(formData.get("file"));
    fileName = uploaded.name;
    const rows: SpreadsheetRow[] = uploaded.rows;

    if (rows.length === 0) {
      await logImportFailureAndRedirect({
        supabase,
        eventId,
        importType: "matches",
        fileName,
        rowCount: 0,
        uploadedBy: user.id,
        summary: "업로드 데이터가 비어 있습니다.",
        errors: [{ rowNumber: 0, message: "행 데이터가 없습니다." }],
        rows: [],
      });
    }

    const normalizedRows = rows.map((row: SpreadsheetRow) => ({
      round_name: row.round_name ?? row.roundName ?? "",
      group_name: row.group_name ?? row.groupName ?? "",
      match_no: row.match_no ?? row.matchNo ?? "",
      court_no: row.court_no ?? row.courtNo ?? "",
      status: row.status ?? "waiting",
      scheduled_at: row.scheduled_at ?? row.scheduledAt ?? "",
      sort_order: row.sort_order ?? row.sortOrder ?? 0,
      note: row.note ?? "",
      player_a1: row.player_a1 ?? row.playerA1 ?? "",
      player_a2: row.player_a2 ?? row.playerA2 ?? "",
      player_b1: row.player_b1 ?? row.playerB1 ?? "",
      player_b2: row.player_b2 ?? row.playerB2 ?? "",
    }));

    const parseResults = normalizedRows.map((row) => matchImportRowSchema.safeParse(row));
    const invalid = parseResults.filter((result) => !result.success);

    if (invalid.length > 0) {
      const errors = parseResults.flatMap((result, index) =>
        result.success
          ? []
          : [{ rowNumber: index + 2, message: result.error.issues[0]?.message ?? "대진표 파일 형식이 올바르지 않습니다.", row: normalizedRows[index] }],
      );
      await logImportFailureAndRedirect({
        supabase,
        eventId,
        importType: "matches",
        fileName,
        rowCount: normalizedRows.length,
        uploadedBy: user.id,
        summary: errors[0]?.message ?? "대진표 파일 형식이 올바르지 않습니다.",
        errors,
        rows: normalizedRows,
      });
    }

    const validRows = parseResults
      .map((result) => (result.success ? result.data : null))
      .filter((row): row is NonNullable<typeof row> => Boolean(row));
    const participantNames = [
      ...new Set(
        validRows
          .flatMap((row) => [row.player_a1, row.player_a2, row.player_b1, row.player_b2])
          .filter((name): name is string => typeof name === "string" && name.length > 0),
      ),
    ];

    const { data: eventPlayers, error: eventPlayersError } = await supabase
      .from("event_players")
      .select("player_id,players(name)")
      .eq("event_id", eventId);

    if (eventPlayersError) {
      redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(eventPlayersError.message)}`);
    }

    const participantMap = new Map<string, string>();
    ((eventPlayers ?? []) as EventPlayerNameRow[]).forEach((row) => {
      const name = Array.isArray(row.players) ? row.players[0]?.name : row.players?.name;
      if (name) participantMap.set(name, row.player_id);
    });

    const missingNames = participantNames.filter((name) => !participantMap.has(name));
    if (missingNames.length > 0) {
      await logImportFailureAndRedirect({
        supabase,
        eventId,
        importType: "matches",
        fileName,
        rowCount: validRows.length,
        uploadedBy: user.id,
        summary: `일정 참가자에 없는 선수명: ${missingNames[0]}`,
        errors: [{ rowNumber: 0, message: `일정 참가자에 없는 선수명: ${missingNames[0]}` }],
        rows: validRows,
      });
    }

    const existingMatchNumbers = new Set(
      ((await supabase.from("matches").select("match_no").eq("event_id", eventId)).data ?? []).map((row) => row.match_no),
    );

    for (const row of validRows) {
      if (existingMatchNumbers.has(row.match_no)) {
        await logImportFailureAndRedirect({
          supabase,
          eventId,
          importType: "matches",
          fileName,
          rowCount: validRows.length,
          uploadedBy: user.id,
          summary: `이미 존재하는 경기 번호입니다: ${row.match_no}`,
          errors: [{ rowNumber: 0, message: `이미 존재하는 경기 번호입니다: ${row.match_no}`, row }],
          rows: validRows,
        });
      }
      existingMatchNumbers.add(row.match_no);
    }

    let successCount = 0;

    for (const row of validRows) {
      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          event_id: eventId,
          round_name: row.round_name || null,
          group_name: row.group_name || null,
          match_no: row.match_no,
          court_no: row.court_no || null,
          status: row.status,
          scheduled_at: row.scheduled_at || null,
          sort_order: row.sort_order,
          note: row.note || null,
        })
        .select("id")
        .single();

      if (matchError || !match) {
        redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(matchError?.message ?? `경기 ${row.match_no} 생성 실패`)}`);
      }

      const slots = [
        { playerName: row.player_a1, side: "A", position: 1 },
        { playerName: row.player_a2, side: "A", position: 2 },
        { playerName: row.player_b1, side: "B", position: 1 },
        { playerName: row.player_b2, side: "B", position: 2 },
      ].filter((slot): slot is MatchImportSlot => Boolean(slot.playerName));

      const { error: slotError } = await supabase.from("match_players").insert(
        slots.map((slot) => ({
          match_id: match.id,
          player_id: participantMap.get(slot.playerName) ?? "",
          side: slot.side,
          position: slot.position,
        })),
      );

      if (slotError) {
        await supabase.from("matches").delete().eq("id", match.id);
        redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(slotError.message)}`);
      }

      successCount += 1;
    }

    await logImport({
      supabase,
      eventId,
      importType: "matches",
      fileName,
      rowCount: validRows.length,
      successCount,
      failCount: 0,
      rawSnapshot: validRows,
      uploadedBy: user.id,
    });

    revalidatePath(`/dashboard/${eventId}`);
    revalidatePath(`/dashboard/${eventId}/matches`);
    revalidatePath(`/dashboard/${eventId}/imports`);
    revalidatePath(`/bracket/${String(formData.get("publicUuid") ?? "")}`);
    redirect(`/dashboard/${eventId}/imports?matchImported=${successCount}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "대진표 업로드에 실패했습니다.";
    redirect(`/dashboard/${eventId}/imports?error=${encodeURIComponent(message)}`);
  }
}
