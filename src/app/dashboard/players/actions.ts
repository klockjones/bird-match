"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPlayerSchema, deletePlayerSchema, setPlayerActiveSchema } from "@/lib/validation/player";

export async function createPlayer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = createPlayerSchema.safeParse({
    name: formData.get("name"),
    gender: formData.get("gender"),
    level: formData.get("level"),
    phone: formData.get("phone"),
    memo: formData.get("memo"),
    affiliation: formData.get("affiliation"),
    englishId: formData.get("englishId"),
    nationalLevel: formData.get("nationalLevel"),
    regionalLevel: formData.get("regionalLevel"),
    isActive: formData.get("isActive") ?? "false",
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "선수 등록 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/players?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase.from("players").insert({
    name: values.name || null,
    gender: values.gender || null,
    level: values.level || null,
    phone: values.phone || null,
    memo: values.memo || null,
    affiliation: values.affiliation || null,
    english_id: values.englishId || null,
    national_level: values.nationalLevel || null,
    regional_level: values.regionalLevel || null,
    is_active: values.isActive === "true",
  });

  if (error) {
    redirect(`/dashboard/players?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/players");
  redirect("/dashboard/players?created=1");
}

export async function deletePlayer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = deletePlayerSchema.safeParse({
    playerId: formData.get("playerId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "선수 삭제 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/players?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase.from("players").delete().eq("id", values.playerId);

  if (error) {
    const message = error.code === "23503" ? "이 선수는 참가 이력이 있어 삭제할 수 없습니다. 비활성으로 전환해주세요." : error.message;
    redirect(`/dashboard/players?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/dashboard/players");
  redirect("/dashboard/players?deleted=1");
}

export async function setPlayerActive(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = setPlayerActiveSchema.safeParse({
    playerId: formData.get("playerId"),
    isActive: formData.get("isActive"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "선수 상태 변경 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/players?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase
    .from("players")
    .update({ is_active: values.isActive === "true" })
    .eq("id", values.playerId);

  if (error) {
    redirect(`/dashboard/players?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard/players");
  redirect("/dashboard/players?statusUpdated=1");
}
