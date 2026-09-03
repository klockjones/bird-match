import { importPlayersCsv } from "@/app/dashboard/[eventId]/imports/actions";
import { SpreadsheetImportForm } from "@/components/dashboard/spreadsheet-import-form";

type ImportPlayersFormProps = {
  eventId: string;
};

export function ImportPlayersForm({ eventId }: ImportPlayersFormProps) {
  return (
    <SpreadsheetImportForm
      title="명단 파일 업로드"
      description="지원 형식: CSV / XLSX / XLS · 컬럼: name, gender, level, phone, memo, team, seed"
      submitLabel="미리보기 확인 후 명단 업로드"
      action={importPlayersCsv}
      hiddenFields={[{ name: "eventId", value: eventId }]}
      columnRules={[
        { label: "name", aliases: ["name", "Name"] },
        { label: "gender", aliases: ["gender", "Gender"] },
        { label: "level", aliases: ["level", "Level"] },
      ]}
      summaryItems={[
        { label: "감지된 선수 행", keys: ["name", "Name"] },
        { label: "팀 배정 행", keys: ["team", "Team"] },
        { label: "시드 입력 행", keys: ["seed", "Seed"] },
      ]}
    />
  );
}
