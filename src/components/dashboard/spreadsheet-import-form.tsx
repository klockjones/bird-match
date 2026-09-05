"use client";

import { useMemo, useState, useTransition } from "react";
import { readUploadedSheet } from "@/lib/imports/csv";

type ColumnRule = {
  label: string;
  aliases: string[];
};

type SpreadsheetImportFormProps = {
  title: string;
  templateUrl: string;
  submitLabel: string;
  action: (formData: FormData) => Promise<void>;
  hiddenFields: Array<{ name: string; value: string }>;
  columnRules: ColumnRule[];
  summaryItems?: Array<{
    label: string;
    keys: string[];
  }>;
  requiredColumnsNote?: string;
};

type PreviewState = {
  fileName: string;
  format: "csv" | "xlsx";
  headers: string[];
  rows: Array<Record<string, string>>;
};

export function SpreadsheetImportForm({
  title,
  templateUrl,
  submitLabel,
  action,
  hiddenFields,
  columnRules,
  summaryItems = [],
  requiredColumnsNote = "템플릿의 색칠된 컬럼(노란색)이 필수 입력값입니다.",
}: SpreadsheetImportFormProps) {
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const missingColumns = useMemo(() => {
    if (!preview) return [] as string[];

    const lowerHeaders = new Set(preview.headers.map((header) => header.toLowerCase()));
    return columnRules
      .filter((rule) => !rule.aliases.some((alias) => lowerHeaders.has(alias.toLowerCase())))
      .map((rule) => rule.label);
  }, [columnRules, preview]);

  const impactSummary = useMemo(() => {
    if (!preview) return [] as Array<{ label: string; value: number }>;
    return summaryItems.map((item) => ({
      label: item.label,
      value: preview.rows.filter((row) => item.keys.some((key) => Boolean(row[key]))).length,
    }));
  }, [preview, summaryItems]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setPreview(null);
    setError(null);

    if (!file) {
      return;
    }

    try {
      const parsed = await readUploadedSheet(file);
      const headers = [...new Set(parsed.rows.flatMap((row) => Object.keys(row)))];
      setPreview({
        fileName: parsed.name,
        format: parsed.format,
        headers,
        rows: parsed.rows,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "파일 미리보기에 실패했습니다.");
    }
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    <form action={handleSubmit} style={{ display: "grid", gap: 12, padding: 16, border: "1px solid #cbd5e1", borderRadius: 12, background: "#ffffff" }}>
      {hiddenFields.map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <a href={templateUrl} download style={{ color: "#1d4ed8", fontSize: 14, fontWeight: 700 }}>템플릿 다운로드</a>
        </div>
        <p style={{ margin: "8px 0 0", color: "#475569" }}>{requiredColumnsNote}</p>
      </div>

      <input
        name="file"
        type="file"
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        required
        onChange={handleFileChange}
      />

      {error ? <p style={{ margin: 0, color: "#b91c1c" }}>{error}</p> : null}

      {preview ? (
        <section style={{ display: "grid", gap: 12, padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>{preview.fileName}</strong>
              <div style={{ color: "#475569", marginTop: 6 }}>
                형식: {preview.format.toUpperCase()} · 총 {preview.rows.length}행
              </div>
            </div>
            <div style={{ color: missingColumns.length === 0 ? "#166534" : "#b45309" }}>
              {missingColumns.length === 0 ? "필수 컬럼 확인 완료" : `누락 의심 컬럼: ${missingColumns.join(", ")}`}
            </div>
          </div>

          <div style={{ color: "#475569" }}>감지된 컬럼: {preview.headers.join(", ") || "없음"}</div>

          {impactSummary.length > 0 ? (
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
              {impactSummary.map((item) => (
                <div key={item.label} style={{ padding: 12, border: "1px solid #dbe3ef", borderRadius: 12, background: "#ffffff", boxShadow: "var(--shadow-soft-rear)" }}>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{item.label}</div>
                  <div style={{ marginTop: 8, color: "#0f172a", fontSize: 24, fontWeight: 800 }}>{item.value}</div>
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {preview.headers.map((header) => (
                    <th key={header} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid #cbd5e1" }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((row, index) => (
                  <tr key={`${preview.fileName}-${index}`}>
                    {preview.headers.map((header) => (
                      <td key={`${header}-${index}`} style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.rows.length > 5 ? <p style={{ margin: 0, color: "#64748b" }}>미리보기는 처음 5행만 표시합니다.</p> : null}
        </section>
      ) : null}

      <button type="submit" disabled={!selectedFile || Boolean(error) || isPending}>
        {isPending ? "처리 중..." : submitLabel}
      </button>
    </form>
  );
}
