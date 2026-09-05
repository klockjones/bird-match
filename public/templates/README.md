# Bird Match Import Templates

## Files

- `roster-template.xlsx`
- `matches-template.xlsx`

Required columns are highlighted with a yellow header cell in each template.

## How to use

1. Open the XLSX file in Excel or Google Sheets
2. Fill in your real data under the header row (roster template ships with no sample rows; matches template keeps sample rows to show the shape)
3. Keep the header row unchanged, or rename it to any recognized alias (see below)
4. Save as XLSX, or export to CSV if needed
5. Upload from `/dashboard/[eventId]/imports`

## Roster columns

Header order in `roster-template.xlsx`, with the Korean labels shown in the file and the underlying field each maps to:

- 소속 → `affiliation`
- LDAP → `english_id` (aliases: `영문ID`, `english_id`, `englishId`)
- 이름 → `name`
- 성별 → `gender`
- 전국급수 → `national_level` (alias: `전국 급수`)
- 지역급수 → `regional_level` (alias: `지역 급수`)
- 메모 → `memo`

Also still accepted if present (not part of the default template): `level`(급수), `phone`(연락처), `team`(팀), `seed`(시드).

Notes:

- 이름(`name`) or LDAP(`english_id`) is required — at least one of the two, not both. Some events collect only 소속+LDAP with no personal name.
- 성별/지역급수 are optional but needed for the auto-bracket generator to include a participant
- Existing-player dedup on upload matches by LDAP first, then by name
- `national_level` / `regional_level` are free text — grading varies by event (e.g. some events subdivide `D` into `E1`/`E2`/`E3`), so there's no fixed list of valid values
- Column headers can be the Korean labels above, the English snake_case key (e.g. `regional_level`), or camelCase/PascalCase variants

## Match columns

- `round_name`
- `group_name`
- `match_no`
- `court_no`
- `status`
- `scheduled_at`
- `sort_order`
- `note`
- `player_a1`
- `player_a2`
- `player_b1`
- `player_b2`

Notes:

- `player_a1` / `player_a2` / `player_b1` / `player_b2` accept either the participant's name or LDAP(`english_id`) — whichever identity that event's roster actually has — and must already exist in the event participant list
- Use blank `player_a2` / `player_b2` for singles
- `status` should be one of: `waiting`, `done`
- `scheduled_at` can use `YYYY-MM-DDTHH:mm`
