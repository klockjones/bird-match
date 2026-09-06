"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  assignEventStaffSchema,
  removeEventStaffSchema,
  updateEventStaffRoleSchema,
} from "@/lib/validation/staff";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentUserProfile } = await supabase.from("users").select("role").eq("id", user.id).single();

  if (currentUserProfile?.role !== "admin") {
    redirect("/dashboard?error=" + encodeURIComponent("운영진 관리는 관리자만 사용할 수 있습니다."));
  }

  return { supabase };
}

export async function assignEventStaff(formData: FormData) {
  const { supabase } = await requireAdmin();

  const parsed = assignEventStaffSchema.safeParse({
    eventId: formData.get("eventId"),
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "운영진 등록 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/staff?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase.from("event_staff").insert({
    event_id: values.eventId,
    user_id: values.userId,
    role: values.role,
  });

  if (error) {
    redirect(`/dashboard/${values.eventId}/staff?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/staff`);
  redirect(`/dashboard/${values.eventId}/staff?assigned=1`);
}

export async function updateEventStaffRole(formData: FormData) {
  const { supabase } = await requireAdmin();

  const parsed = updateEventStaffRoleSchema.safeParse({
    eventId: formData.get("eventId"),
    staffId: formData.get("staffId"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "운영진 권한 수정 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/staff?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase
    .from("event_staff")
    .update({ role: values.role })
    .eq("id", values.staffId)
    .eq("event_id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}/staff?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/staff`);
  redirect(`/dashboard/${values.eventId}/staff?updated=1`);
}

export async function removeEventStaff(formData: FormData) {
  const { supabase } = await requireAdmin();

  const parsed = removeEventStaffSchema.safeParse({
    eventId: formData.get("eventId"),
    staffId: formData.get("staffId"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "운영진 삭제 입력값이 올바르지 않습니다.";
    redirect(`/dashboard/${formData.get("eventId")}/staff?error=${encodeURIComponent(message)}`);
  }

  const values = parsed.data;
  const { error } = await supabase.from("event_staff").delete().eq("id", values.staffId).eq("event_id", values.eventId);

  if (error) {
    redirect(`/dashboard/${values.eventId}/staff?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/dashboard/${values.eventId}`);
  revalidatePath(`/dashboard/${values.eventId}/staff`);
  redirect(`/dashboard/${values.eventId}/staff?removed=1`);
}
