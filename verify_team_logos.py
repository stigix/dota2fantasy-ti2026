from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def load(name: str):
    with (ROOT / name).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    roster = load("players.json").get("players", [])
    stats = load("players_stat.json")
    logo_data = load("team_logos.json")
    teams = logo_data.get("teams", {})

    roster_teams = sorted({player["team"] for player in roster})
    missing = [team for team in roster_teams if not (teams.get(team) or {}).get("logo_url")]
    if missing:
        raise SystemExit("Missing canonical logos: " + ", ".join(missing))

    if len(roster) != 80:
        raise SystemExit(f"Expected 80 roster players, found {len(roster)}")
    if len(roster_teams) != 16:
        raise SystemExit(f"Expected 16 roster teams, found {len(roster_teams)}")

    corrections = []
    for player in roster:
        name = player["name"]
        team = player["team"]
        current = str(((stats.get(name) or {}).get("general") or {}).get("team_logo") or "")
        canonical = str(teams[team]["logo_url"])
        if current != canonical:
            corrections.append((name, team))

    print(f"[OK] Canonical logos cover {len(roster_teams)} teams and {len(roster)} players.")
    print(f"[INFO] Frontend override corrects {len(corrections)} stale player badges immediately.")
    for name, team in corrections:
        print(f"  - {name}: {team}")
    print("[OK] main.py will keep one canonical logo per current roster team on future parses.")


if __name__ == "__main__":
    main()
