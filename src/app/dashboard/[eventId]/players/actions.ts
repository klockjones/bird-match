"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { addEventPlayerSchema } from "@/lib/validation/player";

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
