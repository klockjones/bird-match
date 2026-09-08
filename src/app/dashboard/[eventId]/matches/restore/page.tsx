import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { RestoreMatchesForm } from "@/components/dashboard/restore-matches-form";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";

type RestoreMatchesPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ error?: string }>;
};

export default async function RestoreMatchesPage({ params, searchParams }: RestoreMatchesPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: event, error: eventError }, { data: matches }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase.from("matches").select("id").eq("event_id", eventId),
  ]);

  if (eventError || !event) notFound();

  const detail = event as EventDetailItem;

  if (detail.status === "closed") {
    redirect(`/dashboard/${eventId}/matches/past?closed=1`);
  }

  const matchCount = (matches ?? []).length;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}/matches`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>경기 백업 복구</h1>
        <p className="surface-copy" style={{ margin: 0 }}>{detail.title} 일정의 경기 백업 파일을 업로드해서 복구합니다.</p>
      </div>

      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}

      <RestoreMatchesForm eventId={eventId} publicUuid={detail.public_uuid} matchCount={matchCount} />
    </main>
  );
}
