import { importPlayersCsv } from "@/app/dashboard/[eventId]/imports/actions";
import { SpreadsheetImportForm } from "@/components/dashboard/spreadsheet-import-form";

type ImportPlayersFormProps = {
  eventId: string;
};

export function ImportPlayersForm({ eventId }: ImportPlayersFormProps) {
  return (
    <SpreadsheetImportForm
      title="명단 파일 업로드"
      templateUrl="/templates/roster-template.xlsx"
      requiredColumnsNote="템플릿의 색칠된 컬럼(이름, LDAP) 중 하나는 필수입니다. 둘 다 채워도 됩니다."
      submitLabel="미리보기 확인 후 명단 업로드"
      action={importPlayersCsv}
      hiddenFields={[{ name: "eventId", value: eventId }]}
      columnRules={[
        { label: "이름 또는 LDAP", aliases: ["name", "Name", "이름", "english_id", "englishId", "EnglishId", "LDAP", "영문ID"] },
        { label: "gender", aliases: ["gender", "Gender", "성별"] },
      ]}
      summaryItems={[
        { label: "감지된 참가자 행", keys: ["name", "Name", "이름", "english_id", "englishId", "EnglishId", "LDAP", "영문ID"] },
        { label: "지역급수 입력 행", keys: ["regional_level", "regionalLevel", "지역급수", "지역 급수"] },
      ]}
    />
  );
}
