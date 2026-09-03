import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ImportMatchesForm } from "@/components/dashboard/import-matches-form";
import { ImportPlayersForm } from "@/components/dashboard/import-players-form";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { OperatorTopBar } from "@/components/ui/operator-top-bar";
import { SectionHeader } from "@/components/ui/section-header";
import { SummaryCard } from "@/components/ui/summary-card";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventDetailItem } from "@/lib/types/event";

type EventImportsPageProps = {
  params: Promise<{ eventId: string }>;
  searchParams?: Promise<{
    error?: string;
    errorImport?: string;
    playerImported?: string;
    matchImported?: string;
  }>;
};

type ImportLogItem = {
  id: string;
  import_type: "players" | "matches";
  file_name: string;
  row_count: number;
  success_count: number;
  fail_count: number;
  uploaded_at: string;
  raw_snapshot: {
    status?: string;
    summary?: string;
    errors?: Array<{
      rowNumber: number;
      message: string;
      row?: Record<string, unknown>;
    }>;
    previewRows?: Array<Record<string, unknown>>;
  } | null;
};

export default async function EventImportsPage({ params, searchParams }: EventImportsPageProps) {
  const { eventId } = await params;
  const query = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: event, error: eventError }, { data: imports, error: importsError }] = await Promise.all([
    supabase
      .from("events")
      .select("id,title,public_uuid,event_type,status,event_date,location,is_public,scoring_rule,team_label_1,team_label_2,created_at,updated_at")
      .eq("id", eventId)
      .single(),
    supabase
      .from("imports")
      .select("id,import_type,file_name,row_count,success_count,fail_count,uploaded_at,raw_snapshot")
      .eq("event_id", eventId)
      .order("uploaded_at", { ascending: false }),
  ]);

  if (eventError || !event) {
    notFound();
  }

  const detail = event as EventDetailItem;
  const importLogs = (imports ?? []) as ImportLogItem[];
  const selectedErrorImport = query?.errorImport
    ? importLogs.find((item) => item.id === query.errorImport)
    : importLogs.find((item) => item.raw_snapshot?.status === "failed");
  const errorRows = selectedErrorImport?.raw_snapshot?.errors ?? [];
  const playerImportCount = importLogs.filter((item) => item.import_type === "players").length;
  const matchImportCount = importLogs.filter((item) => item.import_type === "matches").length;

  return (
    <main className="admin-page-shell">
      <div className="admin-hero">
        <div className="operator-menu-link-row">
          <Link href={`/dashboard/${eventId}`} className="operator-menu-arrow" aria-label="운영자 메뉴로 이동">←</Link>
          <span>운영자 메뉴로 이동</span>
        </div>
        <OperatorTopBar name={user.user_metadata?.name as string | undefined} />
        <h1 style={{ margin: 0 }}>업로드 관리</h1>
      </div>

      {query?.error ? <p className="admin-inline-message error">{query.error}</p> : null}
      {query?.playerImported ? <p className="admin-inline-message success">명단 업로드 완료: {query.playerImported}건 반영</p> : null}
      {query?.matchImported ? <p className="admin-inline-message success">대진표 업로드 완료: {query.matchImported}경기 반영</p> : null}
      {importsError ? <p className="admin-inline-message error">업로드 이력을 불러오지 못했습니다: {importsError.message}</p> : null}

      <section className="admin-summary-grid">
        <SummaryCard label="전체 업로드" value={importLogs.length} />
        <SummaryCard label="명단 업로드" value={playerImportCount} />
        <SummaryCard label="대진표 업로드" value={matchImportCount} />
        <SummaryCard label="최근 오류 행" value={errorRows.length} />
      </section>

      {selectedErrorImport ? (
        <section className="staff-card" style={{ borderColor: "#fecaca", background: "#fff7f7" }}>
          <div>
            <h2 style={{ margin: 0, color: "#991b1b" }}>최근 업로드 오류 상세</h2>
            <p style={{ margin: "8px 0 0", color: "#7f1d1d" }}>
              파일: {selectedErrorImport.file_name} · {selectedErrorImport.raw_snapshot?.summary ?? "오류 요약 없음"}
            </p>
          </div>

          {errorRows.length === 0 ? (
            <p style={{ margin: 0, color: "#7f1d1d" }}>행 단위 오류 정보가 없습니다.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {errorRows.slice(0, 10).map((item, index) => (
                <article key={`${selectedErrorImport.id}-${index}`} className="staff-card" style={{ padding: 12, borderColor: "#fecaca" }}>
                  <strong>행 {item.rowNumber || "-"}</strong>
                  <div style={{ marginTop: 6, color: "#991b1b" }}>{item.message}</div>
                  {item.row ? (
                    <pre style={{ margin: "10px 0 0", padding: 10, borderRadius: 8, background: "#f8fafc", color: "#334155", overflowX: "auto", whiteSpace: "pre-wrap" }}>
                      {JSON.stringify(item.row, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))}
              {errorRows.length > 10 ? <p style={{ margin: 0, color: "#7f1d1d" }}>오류 행이 많아 처음 10건만 표시합니다.</p> : null}
            </div>
          )}
        </section>
      ) : null}

      <section className="admin-stack">
        <ImportPlayersForm eventId={eventId} />
        <ImportMatchesForm eventId={eventId} publicUuid={detail.public_uuid} />
      </section>

      <section className="admin-stack">
        <SectionHeader title="업로드 이력" description="어떤 파일이 몇 건 반영되었는지 확인할 수 있습니다." />

        {importLogs.length === 0 ? (
          <EmptyStateCard message="아직 업로드 이력이 없습니다." />
        ) : (
          <div className="admin-stack">
            {importLogs.map((item) => (
              <article key={item.id} className="staff-card">
                <div className="staff-card-top">
                  <div>
                    <h3 className="staff-name">{item.file_name}</h3>
                    <p className="staff-email">유형: {item.import_type === "players" ? "명단" : "대진표"}</p>
                  </div>
                  <div className="staff-meta">
                    <div>총 {item.row_count}건</div>
                    <div>성공 {item.success_count} · 실패 {item.fail_count}</div>
                  </div>
                </div>
                {item.raw_snapshot?.status === "failed" ? (
                  <div style={{ marginTop: 12 }}>
                    <Link href={`/dashboard/${eventId}/imports?errorImport=${item.id}`}>이 오류 상세 보기</Link>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
