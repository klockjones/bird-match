import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UpdateEventForm } from "@/components/dashboard/update-event-form";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";

type EventSettingsPageProps = {
  params: Promise<{ eventId: string }>;
};

export default async function EventSettingsPage({ params }: EventSettingsPageProps) {
  const { eventId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: event, error } = await supabase
    .from("events")
    .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
    .eq("id", eventId)
    .single();

  if (error || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>일정 관리</h1>
        <p className="surface-copy" style={{ margin: 0 }}>생성된 일정의 이름, 날짜, 장소, 상태, 공개 여부를 수정합니다.</p>
      </div>

      <UpdateEventForm event={detail} />
    </main>
  );
}
