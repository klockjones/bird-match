import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const { data: latestPublicEvent } = await supabase
    .from("events")
    .select("public_uuid")
    .eq("is_public", true)
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestPublicEvent?.public_uuid) {
    redirect(`/bracket/${latestPublicEvent.public_uuid}`);
  }

  redirect("/login");
}
