import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BracketIcon, CalendarIcon, ChecklistIcon, ShieldIcon, UsersIcon } from "@/components/ui/menu-icons";
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
          운영자가 현재 일정 상태를 빠르게 확인하고, 참가자·경기·업로드·운영진 화면으로 즉시 이동할 수 있는 허브입니다.
        </p>
      </div>

      {query?.updated ? <p className="admin-inline-message success">일정 설정이 저장되었습니다.</p> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}

      <section className="event-hub-grid">
        <section className="event-launcher-groups">
          <div className="event-launcher-group">
            <div className="event-launcher-group-header">
              <span className="event-launcher-group-icon"><CalendarIcon /></span>
              <div>
                <h2 className="event-launcher-group-title">1. 일정 준비</h2>
                <p className="event-launcher-group-copy">대회 일정을 만들어 운영을 시작합니다.</p>
              </div>
            </div>
            <div className="event-launcher-grid">
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">일정 생성</h3>
                <p className="event-launcher-copy">새 일정을 만들어 대진표와 운영 화면의 기준을 새로 시작합니다.</p>
                <Link className="event-launcher-link" href="/dashboard/new">일정 생성으로 이동</Link>
              </article>
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">일정 관리</h3>
                <p className="event-launcher-copy">지금 이 일정의 이름, 날짜, 상태, 공개 여부를 수정합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/settings`}>일정 관리로 이동</Link>
              </article>
            </div>
          </div>

          <div className="event-launcher-group">
            <div className="event-launcher-group-header">
              <span className="event-launcher-group-icon"><UsersIcon /></span>
              <div>
                <h2 className="event-launcher-group-title">2. 참가자 등록</h2>
                <p className="event-launcher-group-copy">참가자를 일괄 업로드하거나 개별로 등록·확인합니다.</p>
              </div>
            </div>
            <div className="event-launcher-grid">
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">참가자 명단 업로드</h3>
                <p className="event-launcher-copy">CSV/엑셀 파일로 참가자 명단을 한 번에 일괄 등록합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/imports/players`}>참가자 명단 업로드로 이동</Link>
              </article>
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">참가 명단 추가 (수동입력)</h3>
                <p className="event-launcher-copy">선수 마스터에 없는 사람을 바로 등록하면서 이 일정에 추가합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/players/new`}>참가 명단 추가로 이동</Link>
              </article>
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">참가 명단 관리</h3>
                <p className="event-launcher-copy">선수 등록, 일정 참가 연결, 팀 배정 상태를 확인합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/players`}>참가 명단 관리로 이동</Link>
              </article>
            </div>
          </div>

          <div className="event-launcher-group">
            <div className="event-launcher-group-header">
              <span className="event-launcher-group-icon"><BracketIcon /></span>
              <div>
                <h2 className="event-launcher-group-title">3. 경기 생성</h2>
                <p className="event-launcher-group-copy">대진표를 자동 생성하거나, 수기로 만들거나, 파일로 업로드합니다.</p>
              </div>
            </div>
            <div className="event-launcher-grid">
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">대진표 자동 생성</h3>
                <p className="event-launcher-copy">코트 개수와 경기 수를 입력하면 지역급수를 고려한 대진표를 랜덤 생성합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/matches/auto`}>대진표 자동 생성으로 이동</Link>
              </article>
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">대진표 업로드</h3>
                <p className="event-launcher-copy">이미 만들어 둔 대진표 파일을 업로드해 경기를 한 번에 등록합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/imports/matches`}>대진표 업로드로 이동</Link>
              </article>
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">경기 생성 (수동입력)</h3>
                <p className="event-launcher-copy">새 경기를 수기로 하나씩 등록할 때 바로 들어가는 전용 화면입니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/matches/new`}>경기 생성으로 이동</Link>
              </article>
            </div>
          </div>

          <div className="event-launcher-group">
            <div className="event-launcher-group-header">
              <span className="event-launcher-group-icon"><ChecklistIcon /></span>
              <div>
                <h2 className="event-launcher-group-title">4. 경기 운영</h2>
                <p className="event-launcher-group-copy">생성된 경기를 조정하고, 완료된 경기를 확인합니다.</p>
              </div>
            </div>
            <div className="event-launcher-grid">
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">경기 관리</h3>
                <p className="event-launcher-copy">코트, 순번, 점수, 상태를 빠르게 조정하는 운영 중심 화면입니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/matches`}>경기 관리로 이동</Link>
              </article>
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">지난 경기</h3>
                <p className="event-launcher-copy">완료된 경기만 간단히 모아서 확인합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/matches/past`}>지난 경기로 이동</Link>
              </article>
            </div>
          </div>

          <div className="event-launcher-group">
            <div className="event-launcher-group-header">
              <span className="event-launcher-group-icon"><ShieldIcon /></span>
              <div>
                <h2 className="event-launcher-group-title">5. 운영진 설정</h2>
                <p className="event-launcher-group-copy">사용자에 대한 운영 권한을 관리합니다.</p>
              </div>
            </div>
            <div className="event-launcher-grid">
              <article className="event-launcher-card">
                <h3 className="event-launcher-title">운영진 권한 관리</h3>
                <p className="event-launcher-copy">이미 가입한 사용자에게 staff / viewer 권한을 추가하고 관리합니다.</p>
                <Link className="event-launcher-link" href={`/dashboard/${detail.id}/staff`}>운영진 권한 관리로 이동</Link>
              </article>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
