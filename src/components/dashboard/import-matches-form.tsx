import { importMatchesCsv } from "@/app/dashboard/[eventId]/imports/actions";
import { SpreadsheetImportForm } from "@/components/dashboard/spreadsheet-import-form";

type ImportMatchesFormProps = {
  eventId: string;
  publicUuid: string;
};

export function ImportMatchesForm({ eventId, publicUuid }: ImportMatchesFormProps) {
  return (
    <SpreadsheetImportForm
      title="대진표 파일 업로드"
      templateUrl="/templates/matches-template.xlsx"
      submitLabel="미리보기 확인 후 대진표 업로드"
      action={importMatchesCsv}
      hiddenFields={[
        { name: "eventId", value: eventId },
        { name: "publicUuid", value: publicUuid },
      ]}
      columnRules={[
        { label: "match_no", aliases: ["match_no", "matchNo"] },
        { label: "player_a1", aliases: ["player_a1", "playerA1"] },
        { label: "player_b1", aliases: ["player_b1", "playerB1"] },
      ]}
      summaryItems={[
        { label: "감지된 경기", keys: ["match_no", "matchNo"] },
        { label: "코트 지정 경기", keys: ["court_no", "courtNo"] },
        { label: "시간 지정 경기", keys: ["scheduled_at", "scheduledAt"] },
      ]}
    />
  );
}
