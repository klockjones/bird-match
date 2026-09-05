import { importPlayersCsv } from "@/app/dashboard/[eventId]/imports/actions";
import { SpreadsheetImportForm } from "@/components/dashboard/spreadsheet-import-form";

type ImportPlayersFormProps = {
  eventId: string;
};

export function ImportPlayersForm({ eventId }: ImportPlayersFormProps) {
  return (
    <SpreadsheetImportForm
      title="명단 파일 업로드"
      formats={["CSV", "XLSX", "XLS"]}
      requiredColumns={[
        { key: "name", label: "이름" },
        { key: "gender", label: "성별" },
        { key: "level", label: "급수" },
      ]}
      optionalColumns={[
        { key: "phone", label: "연락처" },
        { key: "memo", label: "메모" },
        { key: "affiliation", label: "소속" },
        { key: "english_id", label: "영문ID" },
        { key: "national_level", label: "전국급수" },
        { key: "regional_level", label: "지역급수" },
        { key: "team", label: "팀" },
        { key: "seed", label: "시드" },
      ]}
      templateUrl="/templates/roster-template.csv"
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
