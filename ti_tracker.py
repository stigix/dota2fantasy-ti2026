from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "ti2026.json"
LEAGUES_PATH = ROOT / "leagues.json"
API = "https://api.opendota.com/api"
TI_START = "2026-08-13"
TI_END = "2026-08-23"


def read_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    temporary.replace(path)


def normalize(value: str | None) -> str:
    return re.sub(r"[^a-z0-9]+", "", str(value or "").casefold())


def make_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=4,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({"User-Agent": "dota2fantasy-ti2026-tracker/2.0"})
    return session


def get_json(session: requests.Session, url: str) -> Any:
    response = session.get(url, timeout=45)
    response.raise_for_status()
    return response.json()


def find_league(session: requests.Session, current: int | None) -> tuple[int | None, str | None]:
    if current:
        return int(current), "The International 2026"

    leagues = get_json(session, f"{API}/leagues")
    candidates: list[tuple[int, int, str]] = []
    for league in leagues if isinstance(leagues, list) else []:
        name = str(league.get("name") or "")
        key = normalize(name)
        if "international" in key and "2026" in key:
            exact = key in {"theinternational2026", "international2026"}
            candidates.append((0 if exact else 1, int(league.get("leagueid") or 0), name))

    candidates = [item for item in candidates if item[1] > 0]
    if not candidates:
        return None, None

    candidates.sort()
    _, league_id, name = candidates[0]
    print(f"Detected league: {name} ({league_id})")
    return league_id, name


def ensure_fantasy_league(league_id: int, official_name: str | None) -> None:
    leagues = read_json(LEAGUES_PATH, {})
    key = str(league_id)
    existing = leagues.get(key, {})
    status = "upcoming"
    today = datetime.now(timezone.utc).date()
    start = datetime.fromisoformat(TI_START).date()
    end = datetime.fromisoformat(TI_END).date()
    if start <= today <= end:
        status = "ongoing"
    elif today > end:
        status = "completed"

    defaults = {
        "name": official_name or "The International 2026",
        "short_name": "The International 2026",
        "link": "https://www.dota2.com/esports/",
        "start_date": TI_START,
        "end_date": TI_END,
        "status": status,
        "is_ti": True,
        "fantasy_weight": 2.0,
        "total_deaths_from_torm": 0,
        "firstblood_before_10min": 0,
        "firstblood_before_horn": 0,
        "games<25min": 0,
        "total_matches_parsed": 0,
        "processed_match_ids": [],
    }

    merged = {**defaults, **existing}
    merged.update({
        "name": official_name or existing.get("name") or defaults["name"],
        "short_name": "The International 2026",
        "start_date": TI_START,
        "end_date": TI_END,
        "status": status,
        "is_ti": True,
        "fantasy_weight": 2.0,
    })
    leagues[key] = merged
    write_json(LEAGUES_PATH, leagues)


def team_name(match: dict[str, Any], side: str) -> str:
    direct = match.get(f"{side}_name")
    nested = match.get(f"{side}_team")
    if direct:
        return str(direct)
    if isinstance(nested, dict) and nested.get("name"):
        return str(nested["name"])
    team_id = match.get(f"{side}_team_id")
    return f"Team {team_id}" if team_id else side.title()


def stage_for(start_time: int) -> str:
    date = datetime.fromtimestamp(start_time, tz=timezone.utc).date()
    if date <= datetime(2026, 8, 16, tzinfo=timezone.utc).date():
        return "Swiss"
    if date < datetime(2026, 8, 20, tzinfo=timezone.utc).date():
        return "Elimination Round"
    return "Main Event"


def group_series(matches: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ordered = sorted(matches, key=lambda item: (int(item.get("start_time") or 0), int(item.get("match_id") or 0)))
    groups: list[dict[str, Any]] = []
    by_series_id: dict[str, dict[str, Any]] = {}

    for match in ordered:
        radiant = team_name(match, "radiant")
        dire = team_name(match, "dire")
        start_time = int(match.get("start_time") or 0)
        series_id = match.get("series_id")
        group = None

        if series_id not in (None, 0, "0", ""):
            key = str(series_id)
            group = by_series_id.get(key)
            if group is None:
                group = {
                    "id": f"series-{key}",
                    "team_a": radiant,
                    "team_b": dire,
                    "start_time": start_time,
                    "last_time": start_time,
                    "maps": [],
                    "series_type": int(match.get("series_type") or 1),
                }
                groups.append(group)
                by_series_id[key] = group
        else:
            unordered = {normalize(radiant), normalize(dire)}
            for candidate in reversed(groups):
                candidate_teams = {normalize(candidate["team_a"]), normalize(candidate["team_b"])}
                if unordered == candidate_teams and start_time - int(candidate["last_time"]) <= 6 * 3600:
                    group = candidate
                    break
            if group is None:
                group = {
                    "id": f"series-{int(match.get('match_id') or len(groups) + 1)}",
                    "team_a": radiant,
                    "team_b": dire,
                    "start_time": start_time,
                    "last_time": start_time,
                    "maps": [],
                    "series_type": int(match.get("series_type") or 1),
                }
                groups.append(group)

        group["last_time"] = max(int(group["last_time"]), start_time)
        radiant_win = bool(match.get("radiant_win"))
        winner = radiant if radiant_win else dire
        group["maps"].append({
            "match_id": int(match.get("match_id") or 0),
            "start_time": start_time,
            "winner": winner,
        })

    output = []
    for group in groups:
        score = defaultdict(int)
        for map_data in group["maps"]:
            score[map_data["winner"]] += 1
        team_a = group["team_a"]
        team_b = group["team_b"]
        score_a = int(score[team_a])
        score_b = int(score[team_b])
        wins_needed = 3 if int(group.get("series_type") or 1) >= 2 else 2
        completed = max(score_a, score_b) >= wins_needed
        output.append({
            "id": group["id"],
            "team_a": team_a,
            "team_b": team_b,
            "score_a": score_a,
            "score_b": score_b,
            "completed": completed,
            "winner": team_a if completed and score_a > score_b else team_b if completed and score_b > score_a else None,
            "stage": stage_for(int(group["start_time"])),
            "start_time": int(group["start_time"]),
            "map_ids": [item["match_id"] for item in group["maps"]],
        })
    return output


def sync_fantasy_stats(league_id: int) -> None:
    command = [
        sys.executable,
        str(ROOT / "main.py"),
        "--league",
        str(league_id),
        "--skip-stratz",
        "--delay",
        "0.15",
    ]
    print("Syncing TI maps into fantasy statistics...")
    subprocess.run(command, cwd=ROOT, check=True)

    meta_path = ROOT / "dataset_meta.json"
    meta = read_json(meta_path, {})
    leagues = read_json(LEAGUES_PATH, {})
    meta["leagues"] = list(leagues.keys())
    meta["updated_leagues"] = [str(league_id)]
    write_json(meta_path, meta)


def main() -> None:
    payload = read_json(DATA_PATH, {
        "event": "The International 2026",
        "league_id": None,
        "updated_at": None,
        "status": "upcoming",
        "series": [],
    })
    session = make_session()

    try:
        league_id, official_name = find_league(session, payload.get("league_id"))
    except Exception as exc:
        print(f"League lookup failed: {exc}")
        return

    if not league_id:
        print("TI 2026 League ID is not available on OpenDota yet. Nothing to update.")
        return

    ensure_fantasy_league(league_id, official_name)

    try:
        matches = get_json(session, f"{API}/leagues/{league_id}/matches")
    except Exception as exc:
        print(f"Match lookup failed: {exc}")
        return

    if not isinstance(matches, list):
        print("Unexpected OpenDota response. Nothing to update.")
        return

    series = group_series(matches)
    now = datetime.now(timezone.utc)
    start_date = datetime(2026, 8, 13, tzinfo=timezone.utc).date()
    end_date = datetime(2026, 8, 23, tzinfo=timezone.utc).date()
    event_status = "upcoming" if now.date() < start_date else "ongoing" if now.date() <= end_date else "completed"

    previous_snapshot = {
        "league_id": payload.get("league_id"),
        "status": payload.get("status"),
        "series": payload.get("series") or [],
    }
    current_snapshot = {
        "league_id": league_id,
        "status": event_status,
        "series": series,
    }
    if current_snapshot != previous_snapshot:
        payload.update(current_snapshot)
        payload["updated_at"] = now.isoformat()
        write_json(DATA_PATH, payload)
        print(f"Saved {len(series)} TI 2026 series from {len(matches)} maps.")
    else:
        print("No TI bracket changes.")

    leagues = read_json(LEAGUES_PATH, {})
    processed = {int(match_id) for match_id in leagues.get(str(league_id), {}).get("processed_match_ids", [])}
    available = {int(match.get("match_id") or 0) for match in matches if int(match.get("match_id") or 0) > 0}
    new_maps = sorted(available - processed)
    if new_maps:
        print(f"Found {len(new_maps)} new TI map(s) for fantasy statistics.")
        sync_fantasy_stats(league_id)
    else:
        print("No new TI maps for fantasy statistics.")
    time.sleep(0.1)


if __name__ == "__main__":
    main()
