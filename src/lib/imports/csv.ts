import * as XLSX from "xlsx";

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(text: string) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] as Array<Record<string, string>> };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce<Record<string, string>>((accumulator, header, index) => {
      accumulator[header] = values[index] ?? "";
      return accumulator;
    }, {});
  });

  return { headers, rows };
}

function normalizeSheetRows(rows: unknown[]) {
  return rows.map((row) => {
    if (!row || typeof row !== "object") {
      return {} as Record<string, string>;
    }

    return Object.entries(row as Record<string, unknown>).reduce<Record<string, string>>((accumulator, [key, value]) => {
      accumulator[key] = value == null ? "" : String(value).trim();
      return accumulator;
    }, {});
  });
}

export async function readUploadedSheet(file: FormDataEntryValue | null) {
  if (!(file instanceof File)) {
    throw new Error("파일을 선택해주세요.");
  }

  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    const parsed = parseCsv(await file.text());
    return {
      name: file.name,
      rows: parsed.rows,
      format: "csv" as const,
    };
  }

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("엑셀 시트를 찾을 수 없습니다.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    return {
      name: file.name,
      rows: normalizeSheetRows(rows),
      format: "xlsx" as const,
    };
  }

  throw new Error("CSV, XLSX, XLS 파일만 업로드할 수 있습니다.");
}
