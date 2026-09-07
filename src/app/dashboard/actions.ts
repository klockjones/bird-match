"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createEventSchema, deleteEventSchema, updateEventSchema } from "@/lib/validation/event";

export async function createEvent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = createEventSchema.safeParse({
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    isPublic: formData.get("isPublic") ?? "false",
    scoringRule: formData.get("scoringRule"),
    teamLabel1: formData.get("teamLabel1"),
    teamLabel2: formData.get("teamLabel2"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "일정 생성 입력값이 올바르지 않습니다.";
    redirect(`/dashboard?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;

  const { error } = await supabase.from("events").insert({
    title: values.title,
    event_type: values.eventType,
    event_date: values.eventDate || null,
    location: values.location || null,
    is_public: values.isPublic === "true",
    scoring_rule: values.scoringRule,
    team_label_1: values.eventType === "blue_white" ? values.teamLabel1 || null : null,
    team_label_2: values.eventType === "blue_white" ? values.teamLabel2 || null : null,
    created_by: user.id,
  });

  if (error) {
    redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?created=1");
}

export async function updateEvent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = updateEventSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    eventType: formData.get("eventType"),
    eventDate: formData.get("eventDate"),
    location: formData.get("location"),
    isPublic: formData.get("isPublic") ?? "false",
    scoringRule: formData.get("scoringRule"),
    teamLabel1: formData.get("teamLabel1"),
    teamLabel2: formData.get("teamLabel2"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "일정 수정 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase
    .from("events")
    .update({
      title: values.title,
      event_type: values.eventType,
      event_date: values.eventDate || null,
      location: values.location || null,
      is_public: values.isPublic === "true",
      scoring_rule: values.scoringRule,
      team_label_1: values.eventType === "blue_white" ? values.teamLabel1 || null : null,
      team_label_2: values.eventType === "blue_white" ? values.teamLabel2 || null : null,
      status: values.status,
    })
    .eq("id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/${values.eventId}`);
  redirect(`/dashboard/${values.eventId}?updated=1`);
}

export async function deleteEvent(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsed = deleteEventSchema.safeParse({
    eventId: formData.get("eventId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "일정 삭제 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/settings?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase.from("events").delete().eq("id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard?deletedEvent=1");
}
