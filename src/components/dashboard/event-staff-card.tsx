import { removeEventStaff, updateEventStaffRole } from "@/app/dashboard/[eventId]/staff/actions";
import type { EventStaffItem } from "@/lib/types/staff";

type EventStaffCardProps = {
  eventId: string;
  staff: EventStaffItem;
};

export function EventStaffCard({ eventId, staff }: EventStaffCardProps) {
  const roleDefaultValue = staff.role === "owner" ? "" : staff.role;

  return (
    <article className="staff-card">
      <div className="staff-card-top">
        <div>
          <h3 className="staff-name">{staff.user.name}</h3>
          <p className="staff-email">{staff.user.email}</p>
        </div>
        <div className="staff-meta">
          <span className={`role-chip ${staff.role}`}>{staff.role}</span>
        </div>
      </div>

      <form action={updateEventStaffRole} className="staff-actions">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="staffId" value={staff.id} />
        <label className="form-field staff-role-field">
          <span>권한 변경</span>
          <select name="role" defaultValue={roleDefaultValue} required>
            {staff.role === "owner" ? <option value="" disabled>권한 선택</option> : null}
            <option value="staff">staff</option>
            <option value="viewer">viewer</option>
          </select>
        </label>
        <button type="submit" className="staff-action-button">권한 저장</button>
      </form>

      <form action={removeEventStaff} className="staff-remove-form">
        <input type="hidden" name="eventId" value={eventId} />
        <input type="hidden" name="staffId" value={staff.id} />
        <button type="submit" className="danger-button staff-action-button">권한 제거</button>
      </form>
    </article>
  );
}
