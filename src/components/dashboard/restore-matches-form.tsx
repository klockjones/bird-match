import { restoreMatchesFromBackup } from "@/app/dashboard/[eventId]/matches/actions";
import { HoldToConfirmButton } from "@/components/ui/hold-to-confirm-button";

type RestoreMatchesFormProps = {
  eventId: string;
  publicUuid: string;
  matchCount: number;
};

export function RestoreMatchesForm({ eventId, publicUuid, matchCount }: RestoreMatchesFormProps) {
  return (
    <form action={restoreMatchesFromBackup} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #fca5a5", borderRadius: 12, background: "#fef2f2" }}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="publicUuid" value={publicUuid} />

      <div>
        <h2 style={{ margin: 0, color: "#991b1b" }}>백업 파일로 복구</h2>
        <p className="surface-copy" style={{ margin: "8px 0 0" }}>
          {matchCount > 0 ? `현재 등록된 경기 ${matchCount}건을 모두 지우고, ` : ""}
          업로드한 백업 파일(JSON) 내용으로 경기를 다시 생성합니다. 점수·상태·선수 배정이 백업 시점 그대로 복원됩니다.
        </p>
        <p className="surface-copy" style={{ margin: "4px 0 0" }}>백업에 있는 선수가 현재 참가자 명단에 없으면 복구가 진행되지 않습니다.</p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>백업 파일 (.json)</span>
        <input type="file" name="file" accept="application/json,.json" required />
      </label>

      <HoldToConfirmButton
        className="danger-button"
        label={`꾹 눌러서 백업 파일로 복구 (현재 경기 ${matchCount}건 삭제됨)`}
        holdingLabel="손을 떼면 취소돼요..."
        pendingLabel="복구 중..."
      />
    </form>
  );
}
