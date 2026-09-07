"use client";

export function PrintButton() {
  return (
    <button type="button" className="primary-button no-print" onClick={() => window.print()} style={{ justifySelf: "start" }}>
      PDF로 저장 / 인쇄
    </button>
  );
}
