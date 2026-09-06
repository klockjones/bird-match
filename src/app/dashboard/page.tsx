import Link from "next/link";
import { redirect } from "next/navigation";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventListItem } from "@/lib/types/event";
import { formatDateTime } from "@/lib/utils/format-date";
import { getEventStatusLabel } from "@/lib/utils/status-labels";
import { getTeamAccentStyle } from "@/lib/utils/team-accent";

type DashboardPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
    home?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const { data: events, error } = await supabase
    .from("events")
    .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at")
    .order("created_at", { ascending: false });

  const eventList = (events ?? []) as EventListItem[];

  if (params?.home !== "1" && !params?.created && !params?.error && eventList.length > 0) {
    redirect(`/dashboard/${eventList[0].id}`);
  }

  const publicCount = eventList.filter((event) => event.is_public).length;
  const activeCount = eventList.filter((event) => event.status === "published").length;
  const closedCount = eventList.filter((event) => event.status === "closed").length;

  const currentEvents = eventList.filter((event) => event.status !== "closed");
  const pastEvents = eventList.filter((event) => event.status === "closed");

  const pastEventIds = pastEvents.map((event) => event.id);
  const { data: pastMatches } = pastEventIds.length > 0
    ? await supabase.from("matches").select("event_id,status").in("event_id", pastEventIds)
    : { data: [] as Array<{ event_id: string; status: string }> };

  const pastMatchCounts = new Map<string, { total: number; done: number }>();
  (pastMatches ?? []).forEach((match) => {
    const current = pastMatchCounts.get(match.event_id) ?? { total: 0, done: 0 };
    current.total += 1;
    if (match.status === "done") current.done += 1;
    pastMatchCounts.set(match.event_id, current);
  });

  return (
    <main className="dashboard-shell">
      <div className="dashboard-hero">
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>운영 대시보드</h1>
        <p className="surface-copy" style={{ margin: 0 }}>일정을 만들고, 참가자·경기·운영진·공개 보드를 하나의 흐름으로 연결하는 운영 시작 화면입니다.</p>
      </div>

      {params?.created ? <p className="admin-inline-message success">일정이 생성되었습니다.</p> : null}
      {params?.error ? <p className="admin-inline-message error">{params.error}</p> : null}
      {error ? <p className="admin-inline-message error">일정 목록을 불러오지 못했습니다: {error.message}</p> : null}

      <section className="dashboard-summary-grid">
        <article className="dashboard-summary-card">
          <span className="dashboard-summary-label">전체 일정</span>
          <span className="dashboard-summary-value">{eventList.length}</span>
        </article>
        <article className="dashboard-summary-card">
          <span className="dashboard-summary-label">운영 중</span>
          <span className="dashboard-summary-value">{activeCount}</span>
        </article>
        <article className="dashboard-summary-card">
          <span className="dashboard-summary-label">공개 일정</span>
          <span className="dashboard-summary-value">{publicCount}</span>
        </article>
        <article className="dashboard-summary-card">
          <span className="dashboard-summary-label">종료 일정</span>
          <span className="dashboard-summary-value">{closedCount}</span>
        </article>
      </section>

      <section className="dashboard-section">
        <div className="dashboard-quick-actions">
          <Link href="/dashboard/new" className="dashboard-link-chip primary">새 일정 만들기</Link>
        </div>

        <section className="dashboard-section">
          <div>
            <h2 style={{ marginBottom: 8 }}>진행 중인 일정</h2>
            <p className="surface-copy" style={{ margin: 0 }}>최근 생성된 일정부터 표시합니다. 운영자는 여기서 바로 상세 허브로 진입합니다.</p>
          </div>

          {eventList.length === 0 ? (
            <div className="empty-card">아직 생성된 일정이 없습니다.</div>
          ) : currentEvents.length === 0 ? (
            <div className="empty-card">진행 중인 일정이 없습니다.</div>
          ) : (
            <div className="dashboard-event-list">
              {currentEvents.map((event) => (
                <article key={event.id} className="dashboard-event-card">
                  <div className="dashboard-event-top">
                    <div>
                      <h3 className="dashboard-event-title">
                        <span className="team-dot" style={getTeamAccentStyle(event.title)} aria-hidden />
                        {event.title}
                      </h3>
                      <p className="dashboard-event-subtitle">
                        {event.event_type === "blue_white" ? "청백전" : "일반전"} · {event.location ?? "장소 미정"}
                      </p>
                    </div>
                    <div style={{ textAlign: "right", color: "#475569" }}>
                      <div>{event.event_date ?? "날짜 미정"}</div>
                      <div>등록 {formatDateTime(event.created_at)}</div>
                    </div>
                  </div>

                  <div className="dashboard-event-meta">
                    <div>공개 여부: {event.is_public ? "공개" : "비공개"}</div>
                    <div>점수 규칙: {event.scoring_rule}</div>
                    {event.event_type === "blue_white" ? <div>팀: {event.team_label_1 ?? "팀1"} / {event.team_label_2 ?? "팀2"}</div> : null}
                    <div>공개 링크 키: {event.public_uuid}</div>
                  </div>

                  <div className="dashboard-event-footer">
                    <div className="dashboard-status-row">
                      <span className={`status-chip ${event.status}`}>{getEventStatusLabel(event.status)}</span>
                      {event.is_public ? <span className="meta-chip">공개 중</span> : null}
                    </div>
                    <Link href={`/dashboard/${event.id}`} className="event-launcher-link">일정 관리로 이동</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {pastEvents.length > 0 ? (
          <section className="dashboard-section">
            <div>
              <h2 style={{ marginBottom: 8 }}>지난 일정</h2>
              <p className="surface-copy" style={{ margin: 0 }}>종료된 일정은 간단한 요약만 남습니다.</p>
            </div>

            <div className="dashboard-event-list-compact">
              {pastEvents.map((event) => {
                const counts = pastMatchCounts.get(event.id) ?? { total: 0, done: 0 };
                return (
                  <Link key={event.id} href={`/dashboard/${event.id}`} className="dashboard-event-card-compact">
                    <div>
                      <span className="team-dot" style={getTeamAccentStyle(event.title)} aria-hidden />
                      <span className="dashboard-event-title-compact">{event.title}</span>
                      <span className="muted-text"> · {event.event_date ?? "날짜 미정"} · {event.location ?? "장소 미정"}</span>
                    </div>
                    <span className="muted-text">경기 {counts.total} · 완료 {counts.done}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : null}
      </section>
    </main>
  );
}
