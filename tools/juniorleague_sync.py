#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
juniorleague_sync.py — JuniorLeague results fallback for the team site.

Approved design (Miki, 19.10.2026):
- One polite public read per day of the JuniorLeague "ילדים ג'" category
  (single WordPress REST query; no crawling, no article-page fetches,
  no image/prose copying). Run from the existing 09:00 IL daily check.
- Match only when an article unambiguously identifies one of our fixtures
  (central group, round or date, both clubs, home/away orientation
  consistent with our fixture list) and gives an explicit final score.
  Otherwise skip (fail closed).
- Fill only empty score fields. Manual values always win: a fixture with
  any score is never touched (disagreements are only reported).
- Backup the DATA block before every change (data/backups/).
- Store source URL + fetch time on the game (resultSource) and show
  attribution on the site. No push notifications from this source.
- JuniorLeague has no stated terms of use; keep volume minimal.

Usage:
  python3 tools/juniorleague_sync.py --repo .            # dry run, prints JSON report
  python3 tools/juniorleague_sync.py --repo . --apply    # backup + write index.html
  python3 tools/juniorleague_sync.py --selftest          # embedded matcher tests
  python3 tools/juniorleague_sync.py --repo . --sample posts.json  # offline posts dump

Daily flow (for the monitoring agent): clone repo -> run with --apply ->
if report.fills is non-empty: commit + push. Never call /push/notify for
these fills.
"""

import argparse, json, re, sys, time, urllib.request, urllib.error
from datetime import datetime, timedelta, timezone
from html import unescape
from pathlib import Path

API = "https://www.juniorleague.co.il/wp-json/wp/v2"
CATEGORY_ID = 57  # ילדים ג' (resolved once via /categories?search= on 2026-10-19)
UA = ("MaccabiRehovotTeamSite/1.0 (+https://kazmikidev-afk.github.io/maccabi-rehovot-2026/; "
      "polite daily results fallback, one request per day)")
IL = timezone(timedelta(hours=3))  # Asia/Jerusalem standard; reports use dates only

OUR_HARD_ALIASES = ["מרמורק"]  # distinctive anchor for our club at this age group

# Per-opponent extra aliases (normalized forms), seeded 19.10.2026.
# All are distinctive inside our league registry; single common words are avoided.
MANUAL_ALIASES = {
    "הפועל רעננה": ["הפועל רעננה"],
    "הפועל ראשל\"צ": ["הפועל ראשון לציון"],
    "הפועל ירושלים מזרח": ["ירושלים מזרח"],
    "ה.מ יהודה ד. תומר ברק": ["תומר ברק", "יהודה דוד תומר ברק"],
    "מ.ס. קדימה צורן": ["קדימה צורן"],
    "ס. נס ציונה": ["נס ציונה", "סקציה נס ציונה"],
    "מכבי אשקלון צפון": ["אשקלון צפון"],
    "מ.כ. גני תקווה מרכז": ["גני תקווה מרכז", "גני תקווה"],
    "הפ' ת\"א יאיר לרמן": ["יאיר לרמן", "הפועל תל אביב יאיר לרמן"],
    "הפ' פ\"ת שמואל בייגל": ["שמואל בייגל", "הפועל פתח תקווה שמואל בייגל"],
    "בית\"ר י-ם 1": ["ביתר ירושלים 1"],
    "הפ' כפ\"ס שמעון": ["כפר סבא שמעון"],
    "מכבי חיפה עודד": ["חיפה עודד"],
    "הפועל ב\"ש \"לבן\"": ["באר שבע לבן", "הפועל באר שבע לבן"],
    "מכבי פ\"ת \"חיים הנדלר\"": ["חיים הנדלר", "מכבי פתח תקווה חיים הנדלר"],
    "הפ' ניר רמת השרון מרכז": ["ניר רמת השרון"],
    "מכבי עמישב פ\"ת": ["עמישב פתח תקווה"],
    "מ.ס. ב\"ש 2": ["באר שבע 2", "מועדון ספורט באר שבע 2"],
    "הפועל ר\"ג דרום": ["רמת גן דרום"],
    "בני יהודה ת\"א": ["בני יהודה"],
    "מכבי נתניה": ["מכבי נתניה"],
    "מכבי ב\"ש \"צו פיוס\"": ["מכבי באר שבע צו פיוס", "מכבי באר שבע"],
    "מ.ס. אשדוד סולומון": ["אשדוד סולומון"],
    "מכבי תל אביב עוז": ["תל אביב עוז", "מכבי תל אביב עוז"],
}

ABBR = [
    (r"\bהפ'", "הפועל"), (r"\bמ\.ס\.", "מועדון ספורט"), (r"\bמ\.ס\b", "מועדון ספורט"),
    (r"\bמ\.כ\.", "מכבי"), (r"\bמ\.כ\b", "מכבי"), (r"\bס\.", "סקציה"),
    (r'ב"ש', "באר שבע"), (r'ראשל"צ', "ראשון לציון"), (r'פ"ת', "פתח תקווה"),
    (r'כפ"ס', "כפר סבא"), (r'ת"א', "תל אביב"), (r"\bי-ם\b", "ירושלים"), (r'ר"ג', "רמת גן"),
]
GENERIC_PREFIXES = ["הפועל", "מכבי", "מועדון ספורט", "עירוני", "סקציה"]
AGE_HEADERS = ["נוער", "נערים א", "נערים ב", "נערים ג", "ילדים א", "ילדים ב", "ילדות", "טרום א", "טרום ב"]
OUR_AGE = "ילדים ג"

SCORE_RE = re.compile(r"(?<![\d\u05d0-\u05ea])(\d{1,2})\s*[-:]\s*(\d{1,2})(?!\d)")
ROUND_RE = re.compile(r"מחזור\s+(\d{1,2})")
DATE_RE = re.compile(r"(?<![\d.])([0-3]?\d)[./]([01]?\d)(?:[./](20\d\d))?(?![\d.])")
WIN_VERBS = ["גברה", "ניצחה", "הביסה", "העפילה", "עלתה", "גבר", "ניצח", "הביס", "העפיל"]
DRAW_HINTS = ["הסתיים", "הסתיימה", "נפרדו", "סיימה", "סיים בת", "בתום"]


def normalize(s):
    if not s:
        return ""
    s = unescape(str(s))
    s = (s.replace("״", '"').replace("׳", "'").replace("`", "'")
           .replace("–", "-").replace("—", "-").replace("«", '"').replace("»", '"'))
    for pat, rep in ABBR:
        s = re.sub(pat, rep, s)
    s = re.sub(r'"', " ", s)
    s = re.sub(r"[.,()\[\]!?;]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def strip_html(h):
    t = re.sub(r"<br\s*/?>", "\n", h or "")
    t = re.sub(r"</(p|div|li|h\d)>", "\n", t)
    t = re.sub(r"<script[\s\S]*?</script>", " ", t)
    t = re.sub(r"<[^>]+>", " ", t)
    return unescape(t)


def core_of(norm_name):
    parts = norm_name.split()
    while parts and parts[0] in GENERIC_PREFIXES:
        parts = parts[1:]
    return " ".join(parts)


def alias_regex(alias):
    """Substring match; digit-ending aliases must not be followed by : or a digit
    (so 'באר שבע 2' does not match inside 'באר שבע 2:0')."""
    rx = re.escape(alias)
    if alias[-1].isdigit():
        rx += r"(?![\d:])"
    return re.compile(rx)


class Club:
    def __init__(self, name, ours=False):
        self.name = name
        self.ours = ours
        aliases = set()
        n = normalize(name)
        if n:
            aliases.add(n)
        for a in MANUAL_ALIASES.get(name, []):
            na = normalize(a)
            if na:
                aliases.add(na)
        if ours:
            for a in OUR_HARD_ALIASES:
                aliases.add(normalize(a))
        self.aliases = sorted(aliases, key=len, reverse=True)
        self.rx = [(a, alias_regex(a)) for a in self.aliases]

    def mentioned(self, norm_line):
        return any(r.search(norm_line) for _, r in self.rx)


def build_registry(data):
    clubs = {}
    our = Club(data.get("club", ""), ours=True)
    opponents = []
    seen = set()
    for g in data.get("games", []):
        if g.get("type") in ("league", "cup") and g.get("opponent") and g["opponent"] not in seen:
            seen.add(g["opponent"])
            opponents.append(Club(g["opponent"]))
    # Drop an auto core alias that collides with another club's alias set.
    all_alias_owners = {}
    for c in [our] + opponents:
        for a in c.aliases:
            all_alias_owners.setdefault(a, set()).add(c.name)
    for c in [our] + opponents:
        keep = []
        for a in c.aliases:
            owners = all_alias_owners[a]
            if len(owners) > 1:
                continue  # shared alias: unsafe
            # substring collision: our alias inside another club's alias
            clash = False
            for other in [our] + opponents:
                if other.name == c.name:
                    continue
                for oa in other.aliases:
                    if a != oa and a in oa:
                        clash = True
            if not clash:
                keep.append(a)
        c.aliases = keep
        c.rx = [(a, alias_regex(a)) for a in keep]
    return our, opponents


def split_age_sections(text):
    """If the article has age-group section headers, return only the ילדים ג section.
    Otherwise return the whole text."""
    lines = text.split("\n")
    marks = []  # (line_index, is_ours)
    for i, ln in enumerate(lines):
        t = normalize(ln)
        if not t or len(t) > 40:
            continue
        if "שנתון" in t or any(t == normalize(h) or t.startswith(normalize(h) + " ") for h in AGE_HEADERS + [OUR_AGE]):
            if "שנתון" in t or any(normalize(h) in t for h in AGE_HEADERS + [OUR_AGE]):
                marks.append((i, OUR_AGE in t and not any(h in t for h in ["ילדים א", "ילדים ב"])))
    if not marks:
        return text
    out = []
    for j, (start, ours) in enumerate(marks):
        end = marks[j + 1][0] if j + 1 < len(marks) else len(lines)
        if ours:
            out.extend(lines[start:end])
    return "\n".join(out)


def parse_date_in(text):
    m = DATE_RE.search(text)
    if not m:
        return None
    d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
    y = int(y) if y else None
    if not (1 <= d <= 31 and 1 <= mo <= 12):
        return None
    return (y, mo, d)


def same_date(dt, iso):
    y, m, d = dt
    try:
        ref = datetime.strptime(iso, "%Y-%m-%d")
    except ValueError:
        return False
    if y and y != ref.year:
        return False
    return ref.month == m and ref.day == d


def find_pair(line, our, opponents):
    found = []
    if our.mentioned(line):
        found.append(our)
    for c in opponents:
        if c.mentioned(line):
            found.append(c)
    # distinct clubs only
    uniq = {c.name: c for c in found}
    if our.name not in uniq or len(uniq) != 2:
        return None
    other = next(c for n, c in uniq.items() if n != our.name)
    return our, other


def orient(line, our, other, a_goals, b_goals, fixture):
    """Decide [ours, theirs]. The pair order in the line is A(first mention) / B.
    Cross-check with the fixture's home flag; fail closed on conflict."""
    first = our if line.find(our.aliases[0]) >= 0 and all(
        (line.find(our.aliases[0]) <= line.find(a) if line.find(a) >= 0 else True) for a in other.aliases) else other
    # Simpler: positions of earliest alias match per club.
    def pos(c):
        ps = [m.start() for a, r in c.rx for m in [r.search(line)] if m]
        return min(ps) if ps else 10 ** 9
    first = our if pos(our) < pos(other) else other
    second = other if first is our else our
    home_first = True  # Israeli listing convention: home team first
    score_first, score_second = a_goals, b_goals

    win = any(v in line for v in WIN_VERBS)
    draw = any(v in line for v in DRAW_HINTS)
    on_idx = line.find(" על ")

    def goals_for(first_is_ours, first_home):
        if first_home:
            home_goals, away_goals = score_first, score_second
        else:
            home_goals, away_goals = score_second, score_first
        ours = home_goals if fixture["home"] else away_goals
        theirs = away_goals if fixture["home"] else home_goals
        return [ours, theirs]

    if score_first == score_second:
        if win and not draw:
            return None, "win-verb with level score"
        return goals_for(first is our, True), None

    if win:
        # Subject (first-mentioned club) won. Home-first score convention:
        winner_is_home = score_first > score_second
        winner = first
        # fixture home flag must agree
        winner_home_per_data = fixture["home"] if winner is our else (not fixture["home"])
        if winner_home_per_data != winner_is_home:
            return None, "orientation conflicts fixture home/away"
        return goals_for(first is our, True), None

    # Bare listing "A - B X:Y": accept only home-first, validated by fixture.
    dash = re.search(r"\s[-–]\s", line)
    if not dash:
        return None, "no verb and no listing dash"
    a_home = fixture["home"] if first is our else (not fixture["home"])
    if not a_home:
        return None, "listing order conflicts fixture home/away"
    return goals_for(first is our, True), None


def windows(text):
    """Candidate lines: split on newlines and common separators."""
    out = []
    for chunk in re.split(r"[\n]", text):
        chunk = normalize(chunk)
        if not chunk:
            continue
        out.extend([p.strip() for p in re.split(r"\s[|·•]\s", chunk) if p.strip()])
    return out


def match_articles(posts, data, today):
    our, opponents = build_registry(data)
    fixtures = [g for g in data.get("games", [])
                if g.get("type") in ("league", "cup") and g.get("opponent")]
    fills, skips, conflicts = [], [], []
    scanned = 0
    for p in posts:
        title = strip_html(p.get("title", {}).get("rendered", ""))
        excerpt = strip_html(p.get("excerpt", {}).get("rendered", ""))
        content = strip_html(p.get("content", {}).get("rendered", ""))
        link = p.get("link", "")
        adate = (p.get("date") or "")[:10]
        blob = title + "\n" + excerpt + "\n" + content
        blob = split_age_sections(blob)
        scanned += 1
        for line in windows(blob):
            pair = find_pair(line, our, opponents)
            if not pair:
                continue
            our_c, other = pair
            sm = SCORE_RE.search(line)
            ctx_start = max(0, (sm.start() if sm else 0) - 120)
            ctx = line[ctx_start:(sm.end() + 40 if sm else len(line))]
            if "פנדל" in line or "דו-קרב" in line or "הנקודה הלבנה" in line:
                skips.append({"reason": "penalties - manual entry required", "line": line[:120], "url": link})
                continue
            if "נדח" in line:
                skips.append({"reason": "postponed per article", "line": line[:120], "url": link})
                continue
            if not sm:
                continue
            ga, gb = int(sm.group(1)), int(sm.group(2))
            if ga > 40 or gb > 40:
                skips.append({"reason": "implausible score", "line": line[:120], "url": link})
                continue
            # candidate fixtures: ours vs this opponent, played, any score state
            cand = [g for g in fixtures if g["opponent"] == other.name and g.get("date", "9999") <= today]
            if not cand:
                continue
            cup_ctx = "גביע" in blob[:400] or "גביע" in line
            league_ctx = bool(ROUND_RE.search(line)) or "מחזור" in ctx
            resolved = []
            for g in cand:
                if g["type"] == "cup":
                    if not cup_ctx:
                        continue
                    try:
                        d0 = datetime.strptime(g["date"], "%Y-%m-%d")
                        d1 = datetime.strptime(adate, "%Y-%m-%d")
                    except ValueError:
                        continue
                    if not (d0 <= d1 <= d0 + timedelta(days=21)):
                        continue
                    resolved.append(g)
                else:
                    if cup_ctx and not league_ctx:
                        continue
                    rm = ROUND_RE.search(line)
                    dtm = parse_date_in(line)
                    ok = False
                    if rm and g.get("round") == int(rm.group(1)):
                        ok = True
                    elif dtm and same_date(dtm, g.get("date", "")):
                        ok = True
                    if ok:
                        try:
                            d0 = datetime.strptime(g["date"], "%Y-%m-%d")
                            d1 = datetime.strptime(adate, "%Y-%m-%d")
                            if not (d0 <= d1 <= d0 + timedelta(days=21)):
                                continue
                        except ValueError:
                            continue
                        resolved.append(g)
            if len(resolved) != 1:
                if len(resolved) > 1:
                    skips.append({"reason": "ambiguous fixture", "line": line[:120], "url": link})
                continue
            g = resolved[0]
            score, err = orient(line, our_c, other, ga, gb, g)
            if err:
                skips.append({"reason": err, "line": line[:120], "url": link,
                              "opponent": other.name})
                continue
            if g.get("score") is not None:
                if g["score"] != score:
                    conflicts.append({"uid": g.get("uid"), "opponent": other.name,
                                      "manual": g["score"], "juniorleague": score, "url": link})
                continue
            fills.append({"uid": g.get("uid"), "id": g.get("id"), "type": g["type"],
                          "round": g.get("round"), "date": g["date"], "opponent": other.name,
                          "score": score, "url": link, "title": title.strip(),
                          "articleDate": adate, "line": line[:160]})
    # same fixture filled twice with different scores -> conflict, drop both
    by_uid = {}
    for f in fills:
        by_uid.setdefault(f["uid"], []).append(f)
    final = []
    for uid, fs in by_uid.items():
        scores = {tuple(f["score"]) for f in fs}
        if len(scores) > 1:
            conflicts.append({"uid": uid, "reason": "conflicting reports", "reports": [
                {"score": f["score"], "url": f["url"]} for f in fs]})
        else:
            final.append(fs[0])
    return final, skips, conflicts, scanned


def load_data(repo):
    src = (Path(repo) / "index.html").read_text(encoding="utf-8")
    a = src.index("/*DATA_START*/")
    z = src.index("/*DATA_END*/")
    m = re.search(r"const DATA = ([\s\S]*);\s*$", src[a:z])
    return src, a, z, json.loads(m.group(1))


def write_data(repo, src, a, z, data):
    out = src[:a] + "/*DATA_START*/\nconst DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n" + src[z:]
    (Path(repo) / "index.html").write_text(out, encoding="utf-8")


def fetch_posts(days):
    after = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT00:00:00")
    url = (f"{API}/posts?categories={CATEGORY_ID}&after={after}&per_page=50"
           f"&_fields=id,date,link,title,excerpt,content,categories")
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.loads(r.read().decode("utf-8")), url


def selftest():
    data = {
        "club": "הפועל מרמורק רחובות",
        "games": [
            {"id": 5, "uid": "ifa-2026-27-round-1", "type": "league", "round": 1,
             "date": "2026-10-16", "opponent": "הפועל רעננה", "home": False, "score": None},
            {"id": 35, "uid": "cup-2026-27-round-2-game-32", "type": "cup",
             "date": "2026-10-24", "opponent": "מכבי אשקלון צפון", "home": False, "score": None},
            {"id": 11, "uid": "ifa-2026-27-round-7", "type": "league", "round": 7,
             "date": "2026-12-19", "opponent": "מכבי אשקלון צפון", "home": False, "score": None},
            {"id": 4, "uid": "game-2026-4", "type": "cup",
             "date": "2026-10-11", "opponent": "הפועל ירושלים מזרח", "home": False, "score": [3, 2]},
        ],
    }

    def post(title, body, date="2026-10-18"):
        r = lambda s: s
        return {"title": {"rendered": title}, "excerpt": {"rendered": ""},
                "content": {"rendered": body}, "link": "https://www.juniorleague.co.il/x/", "date": date}

    cases = []

    def check(name, posts, want_fill_uid=None, want_score=None, want_skip=None, want_conflict=False, day="2026-10-19"):
        fills, skips, conflicts, _ = match_articles(posts, json.loads(json.dumps(data)), day)
        ok = True
        if want_fill_uid is None:
            ok = ok and not fills
        else:
            ok = ok and any(f["uid"] == want_fill_uid and (want_score is None or f["score"] == want_score) for f in fills)
        if want_skip:
            ok = ok and any(want_skip in s["reason"] for s in skips)
        if want_conflict:
            ok = ok and bool(conflicts)
        else:
            ok = ok and not conflicts
        cases.append((name, ok, fills, skips, conflicts))

    # 1. bare listing, home-first, round stated -> fill away loss [0,4]
    check("listing fill", [post("ילדים ג' מרכז", "מחזור 1: הפועל רעננה - הפועל מרמורק רחובות 4:0")],
          "ifa-2026-27-round-1", [0, 4])
    # 2. verb form: subject (home) won, consistent -> fill
    check("verb home win", [post("ילדים ג' מרכז", "במחזור 1 הפועל רעננה גברה 4:0 על הפועל מרמורק רחובות")],
          "ifa-2026-27-round-1", [0, 4])
    # 3. verb form with orientation contradicting fixture home/away -> skip
    check("orientation contradiction", [post("ילדים ג' מרכז", "במחזור 1 הפועל רעננה גברה 0:4 על הפועל מרמורק רחובות")],
          None, None, "orientation")
    # 4. penalties -> skip
    check("penalties", [post("גביע ילדים ג'", "הפועל מרמורק רחובות העפילה 4:5 בדו-קרב פנדלים על חשבון מכבי אשקלון צפון", "2026-10-25")],
          None, None, "penalties", day="2026-10-26")
    # 5. postponed -> skip
    check("postponed", [post("גביע ילדים ג'", "המפגש מכבי אשקלון צפון - הפועל מרמורק רחובות נדחה 1:1", "2026-10-25")],
          None, None, "postponed", day="2026-10-26")
    # 6. wrong Rehovot team -> nothing
    check("maccabi rehovot ignored", [post("גביע ילדים ג'", "מכבי רחובות גברה 2:1 על מעלה אדומים")], None)
    # 7. age-section isolation: נוער section mention must not fill; ילדים ג section does
    check("age sections", [post("סיכום סופש", "שנתון נוער\nהפועל מרמורק גברה 3:1 על הפועל רעננה במחזור 1\nשנתון ילדים ג'\nמחזור 1: הפועל רעננה - הפועל מרמורק רחובות 4:0")],
          "ifa-2026-27-round-1", [0, 4])
    # 8. cup fill with same opponent as a league fixture (context = גביע, date near)
    check("cup disambiguation", [post("גביע ילדים ג' סיכום סיבוב ב'", "מכבי אשקלון צפון - הפועל מרמורק רחובות 1:2", "2026-10-25")],
          "cup-2026-27-round-2-game-32", [2, 1], day="2026-10-26")
    # 9. no context for pair that exists in both competitions -> skip (no fill of league)
    check("ambiguous competition", [post("סיכום", "מכבי אשקלון צפון - הפועל מרמורק רחובות 1:2", "2026-12-20")],
          None, day="2026-12-20")
    # 10. manual score wins; disagreement only reported as conflict
    check("manual wins", [post("גביע ילדים ג'", "הפועל ירושלים מזרח - הפועל מרמורק רחובות 5:0", "2026-10-12")],
          None, None, None, want_conflict=True, day="2026-10-13")
    # 11. draw
    check("draw", [post("ילדים ג' מרכז", "מחזור 1: הפועל רעננה - הפועל מרמורק רחובות 2:2")],
          "ifa-2026-27-round-1", [2, 2])
    # 12. no round/date anchor for league -> skip
    check("league needs anchor", [post("ילדים ג' מרכז", "הפועל רעננה - הפועל מרמורק רחובות 4:0")], None)
    # 13. conflicting reports across articles -> conflict, no fill
    check("conflicting reports", [
        post("א", "מחזור 1: הפועל רעננה - הפועל מרמורק רחובות 4:0"),
        post("ב", "מחזור 1: הפועל רעננה - הפועל מרמורק רחובות 3:0")],
        None, None, None, want_conflict=True)

    failed = 0
    for name, ok, fills, skips, conflicts in cases:
        print(("PASS " if ok else "FAIL ") + name)
        if not ok:
            failed += 1
            print("  fills:", json.dumps(fills, ensure_ascii=False)[:400])
            print("  skips:", json.dumps(skips, ensure_ascii=False)[:400])
            print("  conflicts:", json.dumps(conflicts, ensure_ascii=False)[:400])
    print(f"{len(cases) - failed}/{len(cases)} passed")
    return 1 if failed else 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--repo", default=".")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--sample", help="offline WP posts JSON instead of fetching")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    src, a, z, data = load_data(args.repo)
    if args.sample:
        posts = json.loads(Path(args.sample).read_text(encoding="utf-8"))
        fetched_url = "sample:" + args.sample
    else:
        try:
            posts, fetched_url = fetch_posts(args.days)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            print(json.dumps({"status": "fetch_failed", "error": str(e)}, ensure_ascii=False))
            return 2

    today = datetime.now(IL).strftime("%Y-%m-%d")
    fills, skips, conflicts, scanned = match_articles(posts, data, today)
    fetched_at = datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

    report = {"status": "ok", "source": fetched_url, "articles_scanned": scanned,
              "fills": fills, "skips": skips, "conflicts": conflicts}

    if args.apply and fills:
        bdir = Path(args.repo) / "data" / "backups"
        bdir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")
        bpath = bdir / f"data-backup-{stamp}.json"
        bpath.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
        by_uid = {f["uid"]: f for f in fills}
        for g in data["games"]:
            f = by_uid.get(g.get("uid"))
            if not f or g.get("score") is not None:
                continue  # re-check: manual wins even if it changed mid-run
            g["score"] = f["score"]
            g["resultSource"] = {"provider": "JuniorLeague", "url": f["url"],
                                 "title": f["title"], "articleDate": f["articleDate"],
                                 "fetchedAt": fetched_at, "score": f["score"]}
        data["rev"] = int(time.time() * 1000)
        write_data(args.repo, src, a, z, data)
        report["status"] = "applied"
        report["backup"] = str(bpath)
    print(json.dumps(report, ensure_ascii=False, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
