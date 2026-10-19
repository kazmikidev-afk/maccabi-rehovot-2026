# JuniorLeague results fallback

Approved by Miki on 19.10.2026 ("חיובי", replying to the design proposal).

## What it does

Once a day (as part of the existing 09:00 IL daily check), one polite read of the
JuniorLeague "ילדים ג'" category via the WordPress REST API — a single request,
article bodies included in the response. No crawling, no article-page fetches,
no image/prose copying, no polling during matches.

`tools/juniorleague_sync.py` scans those articles for unambiguous reports about
the team's own league/cup fixtures and fills only EMPTY score fields in
`DATA.games` inside `index.html`:

- both clubs must be identified (alias table, normalized abbreviations);
- league: explicit "מחזור N" or the exact date must anchor the fixture;
- cup: "גביע" context + article date within the fixture window;
- the score must be explicit, with orientation consistent with our home/away
  record (conflict -> skip);
- penalties, postponements, ambiguous or conflicting reports -> skip (fail closed);
- a fixture that already has a score is never touched — manual values always win;
  disagreements are only listed in the report (`conflicts`).

Before any change it backs up the full DATA block to `data/backups/`.
Each fill stores `resultSource` (provider, article URL, article date, fetch time,
score) on the game, and the site shows "תוצאה: ג׳וניורליג" (link) on the game card.
If Miki later edits the score manually, the attribution disappears by itself
(the card shows it only while the stored JuniorLeague score equals the current score).

No push notifications are sent from this source. Do not call `/push/notify`
for these fills. JuniorLeague publishes no terms of use; keep request volume
at the one sanctioned read per day.

## Daily run (monitoring agent)

```bash
git clone https://github.com/kazmikidev-afk/maccabi-rehovot-2026.git repo
cd repo
python3 tools/juniorleague_sync.py --repo . --apply   # prints a JSON report
# if report.status == "applied": commit + push index.html and data/backups/
```

`--selftest` runs the embedded matcher tests (13 cases). `--days N` changes the
14-day article lookback. Exit code 2 = fetch failed (report it, change nothing).

Scores in `DATA.games` are always [our goals, their goals], regardless of venue.
