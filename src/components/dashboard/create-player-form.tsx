import { createPlayer } from "@/app/dashboard/players/actions";

type CreatePlayerFormProps = {
  nationalLevelOptions: string[];
  regionalLevelOptions: string[];
};

export function CreatePlayerForm({ nationalLevelOptions, regionalLevelOptions }: CreatePlayerFormProps) {
  return (
    <form action={createPlayer} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      <div>
        <h2 style={{ margin: 0 }}>선수 마스터 등록</h2>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>일정 참가 전, 재사용 가능한 선수 명단을 먼저 관리합니다.</p>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>이름</span>
        <input name="name" required placeholder="예: 김철수" />
      </label>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>성별/구분</span>
          <select name="gender" defaultValue="">
            <option value="">선택 안 함</option>
            <option value="남">남</option>
            <option value="여">여</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>급수/레벨</span>
          <input name="level" placeholder="예: A조 / C급" />
        </label>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>소속</span>
          <input name="affiliation" placeholder="예: 강남구청 배드민턴클럽" />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>영문ID</span>
          <input name="englishId" placeholder="예: cliff.park" />
        </label>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>전국급수</span>
          <input name="nationalLevel" list="national-level-options" placeholder="예: A, B, C, D, E" />
          <datalist id="national-level-options">
            {nationalLevelOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span>지역급수</span>
          <input name="regionalLevel" list="regional-level-options" placeholder="예: A, B, C, D, E" />
          <datalist id="regional-level-options">
            {regionalLevelOptions.map((option) => <option key={option} value={option} />)}
          </datalist>
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span>연락처</span>
        <input name="phone" placeholder="예: 010-0000-0000" />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span>메모</span>
        <textarea name="memo" rows={3} placeholder="예: 초보자, 당일 참가" />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input name="isActive" type="checkbox" value="true" defaultChecked />
        <span>활성 선수로 등록</span>
      </label>

      <button type="submit">선수 등록</button>
    </form>
  );
}
