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

export async function readUploadedCsv(file: FormDataEntryValue | null) {
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

  throw new Error("CSV 파일만 업로드할 수 있습니다.");
}
