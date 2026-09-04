"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addEventPlayerSchema, createEventPlayerSchema } from "@/lib/validation/player";

export async function addEventPlayer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = addEventPlayerSchema.safeParse({
    eventId: formData.get("eventId"),
    playerId: formData.get("playerId"),
    team: formData.get("team") ?? "",
    seed: formData.get("seed"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "참가자 등록 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/players?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const seed = values.seed ? Number(values.seed) : null;

  if (values.seed && Number.isNaN(seed)) {
    redirect(`/dashboard/${values.eventId}/players?error=${encodeURIComponent("시드는 숫자로 입력해주세요.")}`);
  }

  const { error } = await supabase.from("event_players").insert({
    event_id: values.eventId,
    player_id: values.playerId,
    team: values.team || null,
    seed,
    note: values.note || null,
  });

  if (error) {
    redirect(`/dashboard/${values.eventId}/players?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/players`);
  redirect(`/dashboard/${values.eventId}/players?added=1`);
}

export async function createEventPlayer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = createEventPlayerSchema.safeParse({
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    gender: formData.get("gender"),
    level: formData.get("level"),
    team: formData.get("team") ?? "",
    seed: formData.get("seed"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "참가자 등록 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/players?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const seed = values.seed ? Number(values.seed) : null;

  if (values.seed && Number.isNaN(seed)) {
    redirect(`/dashboard/${values.eventId}/players?error=${encodeURIComponent("시드는 숫자로 입력해주세요.")}`);
  }

  const { error } = await supabase.rpc("create_event_player", {
    target_event_id: values.eventId,
    player_name: values.name,
    player_gender: values.gender || null,
    player_level: values.level || null,
    player_phone: null,
    participant_team: values.team || null,
    participant_seed: seed,
    participant_note: values.note || null,
  });

  if (error) {
    redirect(`/dashboard/${values.eventId}/players?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/players`);
  redirect(`/dashboard/${values.eventId}/players?added=1`);
}
