import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { deleteEvent, setEventStatus } from "@/app/dashboard/actions";
import { UpdateEventForm } from "@/components/dashboard/update-event-form";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";

type EventSettingsPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ error?: string; statusUpdated?: string }>;
};

export default async function EventSettingsPage({ params, searchParams }: EventSettingsPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: event, error }, { data: currentUserProfile }, { data: eventPlayers }, { data: matches }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase.from("users").select("role").eq("id", user.id).single(),
    supabase.from("event_players").select("id").eq("event_id", eventId),
    supabase.from("matches").select("id").eq("event_id", eventId),
  ]);

  if (error || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;
  const isAdmin = currentUserProfile?.role === "admin";

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

      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {query?.statusUpdated ? <p className="admin-inline-message success">일정 상태가 변경되었습니다.</p> : null}

      <section className="admin-stack" style={{ border: "1px solid #cbd5e1", borderRadius: 12, padding: 16, background: "#ffffff" }}>
        <div>
          <h2 style={{ marginBottom: 8 }}>{detail.status === "closed" ? "종료된 일정" : "일정 완료 처리"}</h2>
          <p className="surface-copy" style={{ margin: 0 }}>
            {detail.status === "closed"
              ? "참가 명단 관리·경기 관리 등 운영 화면은 숨겨지고, 지난 경기에서만 결과를 확인할 수 있습니다. 참가자/경기 데이터는 그대로 남아있습니다."
              : "완료 처리하면 참가 명단 관리·경기 관리 등 운영 화면이 숨겨지고, 지난 경기에서만 결과를 볼 수 있습니다. 데이터는 지워지지 않으며 언제든 다시 열 수 있습니다."}
          </p>
        </div>
        <form action={setEventStatus} style={{ justifySelf: "start" }}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="status" value={detail.status === "closed" ? "published" : "closed"} />
          <button type="submit" className={detail.status === "closed" ? "filter-pill" : "primary-button"}>
            {detail.status === "closed" ? "다시 열기 (운영 중으로 전환)" : "일정 완료 처리"}
          </button>
        </form>
      </section>

      <UpdateEventForm event={detail} />

      {isAdmin ? (
        <section className="admin-stack" style={{ border: "1px solid #fca5a5", borderRadius: 12, padding: 16, background: "#fef2f2" }}>
          <div>
            <h2 style={{ marginBottom: 8, color: "#991b1b" }}>위험 구역</h2>
            <p className="surface-copy" style={{ margin: 0 }}>
              일정을 삭제하면 참가자 {(eventPlayers ?? []).length}명 · 경기 {(matches ?? []).length}건이 함께 삭제되며 되돌릴 수 없습니다.
            </p>
          </div>
          <form action={deleteEvent} style={{ justifySelf: "start" }}>
            <input type="hidden" name="eventId" value={eventId} />
            <HoldToConfirmButton
              className="danger-button"
              label={`꾹 눌러서 '${detail.title}' 일정 전체 삭제`}
              holdingLabel="손을 떼면 취소돼요..."
              pendingLabel="삭제 중..."
            />
          </form>
        </section>
      ) : null}
    </main>
  );
}
