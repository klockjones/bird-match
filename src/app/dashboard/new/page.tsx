import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateEventForm } from "@/components/dashboard/create-event-form";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type NewEventPageProps = {
  searchParams?: Promise<{ error?: string }>;
};

export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href="/dashboard?home=1" className="operator-menu-arrow" aria-label="일정 목록으로 이동">←</Link>
          <span>일정 목록으로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>일정 생성</h1>
        <p className="surface-copy" style={{ margin: 0 }}>공개 대진표와 운영 화면의 기준이 되는 새 일정을 만듭니다.</p>
      </div>

      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}

      <CreateEventForm />
    </main>
  );
}
