from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache" / "opendota"
LOGOS = ROOT / "team_logos.json"
OUT = ROOT / "team_standings.json"
LEAGUES = ROOT / "leagues.json"


def load(path: Path, default=None):
    if not path.exists():
        return default
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def main() -> None:
    logos = load(LOGOS, {}).get("teams", {})
    id_to_name = {}
    alias_to_name = {}

    def norm(s: str) -> str:
        return "".join(ch for ch in str(s or "").casefold() if ch.isalnum())

    for name, info in logos.items():
        tid = info.get("team_id")
        if tid:
            id_to_name[int(tid)] = name
        alias_to_name[norm(name)] = name
        api = info.get("api_name")
        if api:
            alias_to_name[norm(api)] = name
        for alias in info.get("aliases") or []:
            if isinstance(alias, str) and alias.strip():
                alias_to_name[norm(alias)] = name

    leagues = load(LEAGUES, {})
    # league_id -> fantasy_weight (TI и tier2)
    weights = {}
    for lid, meta in leagues.items():
        w = float(meta.get("fantasy_weight") or 1.0)
        weights[str(lid)] = w

    # team_name -> {wins, losses, matches, weighted_wins, weighted_matches}
    stats = defaultdict(lambda: {
        "wins": 0,
        "losses": 0,
        "matches": 0,
        "weighted_wins": 0.0,
        "weighted_matches": 0.0,
        "by_league": {},
    })

    for path in sorted(CACHE.glob("league_*_matches.json")):
        league_id = path.name.replace("league_", "").replace("_matches.json", "")
        weight = weights.get(league_id, 1.0)
        try:
            matches = json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            continue
        if not isinstance(matches, list):
            continue

        for m in matches:
            if "radiant_win" not in m:
                continue
            r_id = m.get("radiant_team_id")
            d_id = m.get("dire_team_id")
            r_raw = m.get("radiant_team_name")
            d_raw = m.get("dire_team_name")

            r_name = alias_to_name.get(norm(r_raw)) or id_to_name.get(int(r_id or 0))
            d_name = alias_to_name.get(norm(d_raw)) or id_to_name.get(int(d_id or 0))
            if not r_name or not d_name:
                continue

            winner, loser = (r_name, d_name) if m["radiant_win"] else (d_name, r_name)

            for team, is_win in ((winner, True), (loser, False)):
                s = stats[team]
                s["matches"] += 1
                s["weighted_matches"] += weight
                if is_win:
                    s["wins"] += 1
                    s["weighted_wins"] += weight
                else:
                    s["losses"] += 1
                league_bucket = s["by_league"].setdefault(league_id, {"wins": 0, "losses": 0, "matches": 0})
                league_bucket["matches"] += 1
                if is_win:
                    league_bucket["wins"] += 1
                else:
                    league_bucket["losses"] += 1

    result = {}
    for team, s in stats.items():
        wr = (s["wins"] / s["matches"] * 100) if s["matches"] else 50.0
        wwr = (s["weighted_wins"] / s["weighted_matches"] * 100) if s["weighted_matches"] else 50.0
        result[team] = {
            "wins": s["wins"],
            "losses": s["losses"],
            "matches": s["matches"],
            "winrate": round(wr, 1),
            "weighted_winrate": round(wwr, 1),
            "by_league": s["by_league"],
        }

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(result)} teams → {OUT.name}")
    for name, s in sorted(result.items(), key=lambda x: x[1]["weighted_winrate"], reverse=True)[:16]:
        print(f"  {name:25} {s['weighted_winrate']:5.1f}%  ({s['wins']}-{s['losses']})")


if __name__ == "__main__":
    main()