import { assignEventStaff } from "@/app/dashboard/[eventId]/staff/actions";
import type { AppUserItem } from "@/lib/types/staff";

type AssignEventStaffFormProps = {
  eventId: string;
  users: AppUserItem[];
};

export function AssignEventStaffForm({ eventId, users }: AssignEventStaffFormProps) {
  return (
    <form action={assignEventStaff} className="surface-card" style={{ display: "grid", gap: 12 }}>
      <input type="hidden" name="eventId" value={eventId} />
      <div>
        <h2 style={{ margin: 0 }}>권한 추가</h2>
        <p className="surface-copy" style={{ margin: "8px 0 0" }}>이미 가입한 사용자 중에서 역할에 맞는 권한을 추가합니다. ( staff / viewer)</p>
      </div>

      <label className="form-field">
        <span>사용자</span>
        <select name="userId" defaultValue="" required>
          <option value="" disabled>사용자 선택</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>{user.name} · {user.email}</option>
          ))}
        </select>
      </label>

        <label className="form-field">
          <span>권한</span>
          <select name="role" defaultValue="staff">
            <option value="staff">staff</option>
            <option value="viewer">viewer</option>
          </select>
        </label>

      <button type="submit" disabled={users.length === 0}>{users.length === 0 ? "추가할 사용자가 없습니다" : "권한 추가"}</button>
    </form>
  );
}
