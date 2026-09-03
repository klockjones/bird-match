import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AssignEventStaffForm } from "@/components/dashboard/assign-event-staff-form";
import { EventStaffCard } from "@/components/dashboard/event-staff-card";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppUserItem, EventStaffItem } from "@/lib/types/staff";

type EventStaffPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{ assigned?: string; updated?: string; removed?: string; error?: string }>;
};

type EventStaffRow = {
  id: string;
  role: "owner" | "staff" | "viewer";
  created_at: string;
  users: AppUserItem | AppUserItem[] | null;
};

export default async function EventStaffPage({ params, searchParams }: EventStaffPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: event, error: eventError }, { data: users, error: usersError }, { data: eventStaff, error: staffError }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase.from("users").select("id,email,name,role,created_at").order("name", { ascending: true }),
    supabase
      .from("event_staff")
      .select("id,role,created_at,users(id,email,name,role,created_at)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false }),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const allUsers = (users ?? []) as AppUserItem[];
  const staffList = ((eventStaff ?? []) as EventStaffRow[])
    .map((row) => {
      const appUser = Array.isArray(row.users) ? row.users[0] : row.users;
      if (!appUser) return null;
      return { id: row.id, role: row.role, created_at: row.created_at, user: appUser } satisfies EventStaffItem;
    })
    .filter((row): row is EventStaffItem => Boolean(row));

  const assignedUserIds = new Set(staffList.map((staff) => staff.user.id));
  const availableUsers = allUsers.filter((item) => !assignedUserIds.has(item.id));
  const staffCount = staffList.filter((item) => item.role === "staff").length;
  const viewerCount = staffList.filter((item) => item.role === "viewer").length;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>운영진 관리</h1>
      </div>

      {query?.assigned ? <p className="admin-inline-message success">운영진이 추가되었습니다.</p> : null}
      {query?.updated ? <p className="admin-inline-message success">운영진 권한이 변경되었습니다.</p> : null}
      {query?.removed ? <p className="admin-inline-message success">운영진이 제거되었습니다.</p> : null}
      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {usersError ? <p className="admin-inline-message error">사용자 목록을 불러오지 못했습니다: {usersError.message}</p> : null}
      {staffError ? <p className="admin-inline-message error">운영진 목록을 불러오지 못했습니다: {staffError.message}</p> : null}

      <section className="admin-summary-grid">
        <article className="admin-summary-card">
          <span className="admin-summary-label">전체 운영진</span>
          <span className="admin-summary-value">{staffList.length}</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-label">staff</span>
          <span className="admin-summary-value">{staffCount}</span>
        </article>
        <article className="admin-summary-card">
          <span className="admin-summary-label">viewer</span>
          <span className="admin-summary-value">{viewerCount}</span>
        </article>
      </section>

      <AssignEventStaffForm eventId={eventId} users={availableUsers} />

      <section className="admin-stack">
        <div className="staff-section-intro">
          <h2 style={{ marginBottom: 8 }}>현재 운영진</h2>
        </div>

        {staffList.length === 0 ? (
          <div className="empty-card">아직 지정된 운영진이 없습니다.</div>
        ) : (
          <div className="staff-grid">
            {staffList.map((staff) => (
              <EventStaffCard key={staff.id} eventId={eventId} staff={staff} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
