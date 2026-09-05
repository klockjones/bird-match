# Bird Match Import Templates

## Files

- `roster-template.csv`
- `matches-template.csv`

## How to use

1. Open the CSV file in Excel or Google Sheets
2. Replace sample rows with your real data
3. Keep the header row unchanged
4. Save as CSV, or export to XLSX if needed
5. Upload from `/dashboard/[eventId]/imports`

## Roster columns

- `name`
- `gender`
- `level`
- `phone`
- `memo`
- `affiliation` (소속)
- `english_id` (영문ID)
- `national_level` (전국급수)
- `regional_level` (지역급수)
- `team`
- `seed`

Notes:

- `team` is optional for general events
- `team` should match the event's actual team names for 청백전 (for example `어피치`, `라이언`)
- `seed` is optional
- `national_level` / `regional_level` are free text — grading varies by event (e.g. some events subdivide `D` into `E1`/`E2`/`E3`), so there's no fixed list of valid values

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

- Player names in match import must already exist in the event participant list
- Use blank `player_a2` / `player_b2` for singles
- `status` should be one of: `waiting`, `done`
- `scheduled_at` can use `YYYY-MM-DDTHH:mm`
