import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";

type EventDetailPageProps = {
  params: Promise<{
    eventId: string;
  }>;
  searchParams?: Promise<{
    updated?: string;
    error?: string;
  }>;
};

export default async function EventDetailPage({ params, searchParams }: EventDetailPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: event, error }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
  ]);

  if (error || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <p className="surface-copy" style={{ margin: 0 }}>
          운영자가 현재 이벤트 상태를 빠르게 확인하고, 참가자·경기·업로드·운영진 화면으로 즉시 이동할 수 있는 허브입니다.
        </p>
      </div>

      {query?.updated ? <p className="admin-inline-message success">이벤트 설정이 저장되었습니다.</p> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}

      <section className="event-hub-grid">
        <section className="admin-stack">
          <h2 style={{ margin: 0 }}>운영 바로가기</h2>
          <div className="event-launcher-grid">
            <article className="event-launcher-card">
              <h3 className="event-launcher-title">대진표 / 경기</h3>
              <p className="event-launcher-copy">코트, 순번, 점수, 상태를 빠르게 조정하는 운영 중심 화면입니다.</p>
              <Link className="event-launcher-link" href={`/dashboard/${detail.id}/matches`}>경기 관리</Link>
            </article>
            <article className="event-launcher-card">
              <h3 className="event-launcher-title">참가 명단</h3>
              <p className="event-launcher-copy">선수 등록, 이벤트 참가 연결, 팀 배정 상태를 확인합니다.</p>
              <Link className="event-launcher-link" href={`/dashboard/${detail.id}/players`}>참가 명단 관리</Link>
            </article>
            <article className="event-launcher-card">
              <h3 className="event-launcher-title">경기 생성</h3>
              <p className="event-launcher-copy">새 경기를 수기로 하나씩 등록할 때 바로 들어가는 전용 화면입니다.</p>
              <Link className="event-launcher-link" href={`/dashboard/${detail.id}/matches/new`}>경기 생성으로 이동</Link>
            </article>
            <article className="event-launcher-card">
              <h3 className="event-launcher-title">업로드</h3>
              <p className="event-launcher-copy">명단/대진표 업로드, 미리보기, 오류 리포트를 한 곳에서 확인합니다.</p>
              <Link className="event-launcher-link" href={`/dashboard/${detail.id}/imports`}>업로드 관리</Link>
            </article>
            <article className="event-launcher-card">
              <h3 className="event-launcher-title">운영진</h3>
              <p className="event-launcher-copy">이미 가입한 사용자에게 staff / viewer 권한을 추가하고 관리합니다.</p>
              <Link className="event-launcher-link" href={`/dashboard/${detail.id}/staff`}>운영진 메뉴 이동</Link>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}
