from __future__ import annotations

import argparse
import json
import os
import time
import unicodedata
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import cloudscraper
import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parent
CACHE_DIR = ROOT / ".cache"
OPENDOTA_CACHE = CACHE_DIR / "opendota"
STRATZ_CACHE = CACHE_DIR / "stratz"

OPENDOTA_BASE = "https://api.opendota.com/api"
STRATZ_URL = "https://api.stratz.com/graphql"
TEAM_LOGOS_PATH = ROOT / "team_logos.json"

TITLE_KEYS = (
    "str",
    "agi",
    "int",
    "all",
    "green",
    "blue",
    "red",
    "undead",
    "horns",
    "bearded",
    "aquatic",
    "first_pick",
    "last_pick",
    "games_with_arcana",
    "games_with_hero_master",
)

SUBTITLE_KEYS = (
    "0_kills",
    "lowest_networth",
    "bbs_before_30min",
    "most_deaths",
    "4+_active_items",
    "most_assists",
    "9_slots",
    "lost_games",
    "most_voice_lines",
)

STAT_TEMPLATE = {
    0: {
        "red": {
            "kills": [],
            "deaths": [],
            "creep_score": [],
            "gpm": [],
            "madstone_collected": [],
            "tower_kills": [],
        },
        "green": {
            "roshan_kills": [],
            "teamfight_participation": [],
            "stuns": [],
            "courier_kills": [],
            "tormentor_kills": [],
            "firstblood": [],
        },
    },
    1: {
        "red": {
            "kills": [],
            "deaths": [],
            "creep_score": [],
            "gpm": [],
            "madstone_collected": [],
            "tower_kills": [],
        },
        "blue": {
            "obs_placed": [],
            "camps_stacked": [],
            "runes_grabbed": [],
            "watchers_taken": [],
            "smokes_used": [],
        },
        "green": {
            "roshan_kills": [],
            "teamfight_participation": [],
            "stuns": [],
            "courier_kills": [],
            "tormentor_kills": [],
            "firstblood": [],
        },
    },
    2: {
        "blue": {
            "obs_placed": [],
            "camps_stacked": [],
            "runes_grabbed": [],
            "watchers_taken": [],
            "smokes_used": [],
        },
        "green": {
            "roshan_kills": [],
            "teamfight_participation": [],
            "stuns": [],
            "courier_kills": [],
            "tormentor_kills": [],
            "firstblood": [],
        },
    },
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build TI 2026 fantasy statistics.")
    parser.add_argument(
        "--league",
        action="append",
        help="Process only this league ID. Can be supplied more than once.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Clear stored statistics for the selected leagues before parsing.",
    )
    parser.add_argument(
        "--skip-stratz",
        action="store_true",
        help="Use OpenDota only. Hero mastery data will be unavailable.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.1,
        help="Delay between external requests in seconds (default: 1.1).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Limit matches per league for a test run (0 means all).",
    )
    parser.add_argument(
        "--tier2-only",
        action="store_true",
        help="Resolve and process only tournaments from tier2_catalog.json.",
    )
    return parser.parse_args()


def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
    temporary.replace(path)


def normalize_name(value: str | None) -> str:
    if not value:
        return ""
    normalized = unicodedata.normalize("NFKC", value).strip().casefold()
    normalized = normalized.replace("_", " ")
    normalized = "".join(
        char if char.isascii() and char.isalnum() else " "
        for char in normalized
    )
    return " ".join(normalized.split())


def compact_name(value: str | None) -> str:
    return "".join(normalize_name(value).split())


def canonical_team_logo(team_logos: dict[str, Any], team_name: str) -> str:
    return str(
        ((team_logos.get("teams") or {}).get(team_name) or {}).get("logo_url") or ""
    ).strip()


def team_logo_source_epoch(entry: dict[str, Any]) -> int:
    value = entry.get("source_match_start_time")
    if not value:
        return 0
    try:
        return int(datetime.fromisoformat(str(value).replace("Z", "+00:00")).timestamp())
    except (TypeError, ValueError):
        return 0


def update_team_logo_from_match(
    team_logos: dict[str, Any],
    roster_team_name: str,
    match_team: dict[str, Any] | None,
    match: dict[str, Any],
) -> None:
    if not match_team:
        return

    logo_url = str(match_team.get("logo_url") or "").strip()
    match_team_name = str(match_team.get("name") or "").strip()
    if not logo_url or not match_team_name:
        return

    teams = team_logos.setdefault("teams", {})
    entry = teams.setdefault(
        roster_team_name,
        {
            "team_id": None,
            "api_name": roster_team_name,
            "aliases": [roster_team_name],
            "logo_url": "",
            "source_match_id": None,
            "source_match_start_time": None,
        },
    )
    aliases = {
        normalize_name(alias)
        for alias in [roster_team_name, entry.get("api_name"), *(entry.get("aliases") or [])]
        if alias
    }
    if normalize_name(match_team_name) not in aliases:
        # A current roster player can have historical matches for an old team.
        # Never let that old badge replace the current team's canonical badge.
        return

    match_start = int(match.get("start_time") or 0)
    if match_start < team_logo_source_epoch(entry):
        return

    entry["team_id"] = int(match_team.get("team_id") or match_team.get("id") or 0) or entry.get("team_id")
    entry["api_name"] = match_team_name
    entry["logo_url"] = logo_url
    entry["source_match_id"] = int(match.get("match_id") or 0) or None
    entry["source_match_start_time"] = datetime.fromtimestamp(
        match_start, timezone.utc
    ).isoformat() if match_start else None
    team_logos["updated_at"] = datetime.now(timezone.utc).isoformat()


def apply_canonical_team_logos(
    player_stats: dict[str, Any],
    roster_by_name: dict[str, dict[str, Any]],
    team_logos: dict[str, Any],
) -> None:
    for canonical, roster_player in roster_by_name.items():
        general = player_stats.setdefault(canonical, {}).setdefault("general", {})
        general["team_name"] = roster_player["team"]
        general["team_logo"] = canonical_team_logo(team_logos, roster_player["team"])
        general["pos"] = int(roster_player["pos"])
        general["position"] = int(roster_player["position"])


def new_league_payload(event: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": event["name"],
        "short_name": event.get("short_name", event["name"]),
        "link": event.get("link", ""),
        "start_date": event.get("start_date", ""),
        "end_date": event.get("end_date", ""),
        "status": "completed",
        "tier": int(event.get("tier", 2)),
        "catalog_key": event["key"],
        "fantasy_weight": float(event.get("fantasy_weight", 0.35)),
        "coverage_threshold_maps": int(event.get("coverage_threshold_maps", 20)),
        "minimum_weight_factor": float(event.get("minimum_weight_factor", 0.25)),
        "total_deaths_from_torm": 0,
        "firstblood_before_10min": 0,
        "firstblood_before_horn": 0,
        "games<25min": 0,
        "total_matches_parsed": 0,
        "processed_match_ids": [],
    }


def sync_optional_leagues(
    session: requests.Session,
    leagues: dict[str, Any],
    catalog: dict[str, Any],
    delay: float,
) -> list[str]:
    events = catalog.get("tournaments", []) if isinstance(catalog, dict) else []
    if not events:
        return []

    threshold = int(catalog.get("coverage_threshold_maps", 20))
    minimum_factor = float(catalog.get("minimum_weight_factor", 0.25))
    event_keys = {str(event.get("key")) for event in events if event.get("key")}
    resolved = [
        league_id
        for league_id, league in leagues.items()
        if str(league.get("catalog_key", "")) in event_keys
    ]

    try:
        response = session.get(f"{OPENDOTA_BASE}/leagues", timeout=45)
        response.raise_for_status()
        listing = response.json()
        if not isinstance(listing, list):
            raise ValueError("OpenDota /leagues response is not a list")
    except Exception as exc:  # noqa: BLE001 - optional catalogue must not block main data
        print(f"[warning] Tier-2 league discovery skipped: {exc}")
        return sorted(set(resolved), key=int)

    changed = False
    for event in events:
        event = dict(event)
        event["coverage_threshold_maps"] = int(event.get("coverage_threshold_maps", threshold))
        event["minimum_weight_factor"] = float(event.get("minimum_weight_factor", minimum_factor))
        aliases = [event.get("name", ""), *event.get("aliases", [])]
        normalized_aliases = {compact_name(alias) for alias in aliases if alias}

        candidates = []
        for item in listing:
            item_name = compact_name(item.get("name"))
            if not item_name:
                continue
            exact = item_name in normalized_aliases
            contains = any(alias and (alias in item_name or item_name in alias) for alias in normalized_aliases)
            if exact or contains:
                candidates.append((1 if exact else 0, int(item.get("leagueid") or 0), item))

        existing_ids = [
            league_id
            for league_id, league in leagues.items()
            if league.get("catalog_key") == event.get("key")
        ]
        configured_id = str(event.get("league_id") or "").strip()
        if configured_id:
            # Some OpenDota league names are shortened or renamed. An explicit ID in
            # tier2_catalog.json is authoritative and avoids fuzzy matches selecting a
            # newer, unrelated empty league.
            league_id = configured_id
        elif candidates:
            candidates.sort(key=lambda entry: (entry[0], entry[1]), reverse=True)
            league_id = str(candidates[0][1])
        elif existing_ids:
            league_id = str(existing_ids[0])
        else:
            print(f"[warning] Tier-2 tournament was not found in OpenDota: {event.get('name')}")
            continue

        # Remove stale catalogue mappings only when they contain no parsed data. This
        # safely migrates the old ESL Challenger mapping (19951 -> 19575) without
        # touching any real statistics.
        for stale_id in list(existing_ids):
            if stale_id == league_id:
                continue
            stale = leagues.get(stale_id, {})
            has_data = bool(stale.get("processed_match_ids")) or int(stale.get("total_matches_parsed", 0) or 0) > 0
            if not has_data:
                leagues.pop(stale_id, None)
                if stale_id in resolved:
                    resolved.remove(stale_id)
                changed = True
                print(f"[tier2] removed stale empty League ID {stale_id} for {event.get('short_name', event.get('name'))}")

        current = leagues.setdefault(league_id, new_league_payload(event))
        metadata = new_league_payload(event)
        for key in (
            "name", "short_name", "link", "start_date", "end_date", "tier",
            "catalog_key", "fantasy_weight", "coverage_threshold_maps",
            "minimum_weight_factor",
        ):
            if current.get(key) != metadata[key]:
                current[key] = metadata[key]
                changed = True
        if league_id not in resolved:
            resolved.append(league_id)
            changed = True
        print(
            f"[tier2] {event.get('short_name', event.get('name'))}: "
            f"League ID {league_id}, fantasy weight x{current['fantasy_weight']:.2f}"
        )

    if changed:
        write_json(ROOT / "leagues.json", leagues)
    if delay > 0:
        time.sleep(min(delay, 1.0))
    return sorted(set(resolved), key=int)


def make_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=4,
        backoff_factor=1.0,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET", "POST"),
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({"User-Agent": "dota2fantasy-ti2026/1.0"})
    return session


def cached_get_json(
    session: requests.Session,
    url: str,
    cache_path: Path,
    delay: float,
) -> Any:
    cached = read_json(cache_path)
    if cached is not None:
        return cached

    response = session.get(url, timeout=45)
    response.raise_for_status()
    payload = response.json()
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    write_json(cache_path, payload)
    if delay > 0:
        time.sleep(delay)
    return payload


def fetch_stratz_match(
    scraper: cloudscraper.CloudScraper,
    match_id: int,
    token: str,
    delay: float,
) -> dict[str, Any]:
    cache_path = STRATZ_CACHE / f"{match_id}.json"
    cached = read_json(cache_path)
    if cached is not None:
        return cached

    query = """
    query MatchFantasy($id: Long!) {
      match(id: $id) {
        firstBloodTime
        players {
          heroId
          dotaPlus { level }
        }
      }
    }
    """
    response = scraper.post(
        STRATZ_URL,
        json={"query": query, "variables": {"id": match_id}},
        headers={"Authorization": f"Bearer {token}"},
        timeout=45,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("errors"):
        raise RuntimeError(f"STRATZ returned errors: {payload['errors']}")

    cache_path.parent.mkdir(parents=True, exist_ok=True)
    write_json(cache_path, payload)
    if delay > 0:
        time.sleep(delay)
    return payload


def clone_stats_template(pos: int) -> dict[str, Any]:
    return json.loads(json.dumps(STAT_TEMPLATE[pos]))


def empty_league_record(pos: int) -> dict[str, Any]:
    return {
        "stats": clone_stats_template(pos),
        "titles": {key: 0 for key in TITLE_KEYS},
        "subtitles": {key: 0 for key in SUBTITLE_KEYS},
    }


def build_roster_maps(roster_data: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    by_name: dict[str, dict[str, Any]] = {}
    aliases: dict[str, str] = {}

    for player in roster_data.get("players", []):
        canonical = player["name"]
        by_name[canonical] = player
        for alias in [canonical, *player.get("aliases", [])]:
            aliases[normalize_name(alias)] = canonical

    return by_name, aliases


def ensure_player(
    player_stats: dict[str, Any],
    roster_player: dict[str, Any],
    league_id: str,
    match_player: dict[str, Any],
    match: dict[str, Any],
    team_logos: dict[str, Any],
) -> dict[str, Any]:
    name = roster_player["name"]
    record = player_stats.setdefault(name, {})
    general = record.setdefault("general", {})
    general["pos"] = int(roster_player["pos"])
    general["position"] = int(roster_player["position"])
    general["team_name"] = roster_player["team"]

    radiant = bool(match_player.get("isRadiant", match_player.get("player_slot", 0) < 128))
    team = match.get("radiant_team") if radiant else match.get("dire_team")
    update_team_logo_from_match(team_logos, roster_player["team"], team, match)
    general["team_logo"] = canonical_team_logo(team_logos, roster_player["team"])

    league_record = record.setdefault(league_id, empty_league_record(int(roster_player["pos"])))
    return league_record


def reset_selected_leagues(
    player_stats: dict[str, Any],
    leagues: dict[str, Any],
    selected_ids: list[str],
) -> None:
    for player in player_stats.values():
        for league_id in selected_ids:
            player.pop(league_id, None)

    for league_id in selected_ids:
        league = leagues[league_id]
        league["total_deaths_from_torm"] = 0
        league["firstblood_before_10min"] = 0
        league["firstblood_before_horn"] = 0
        league["games<25min"] = 0
        league["total_matches_parsed"] = 0
        league["processed_match_ids"] = []


def pick_first_and_last(match: dict[str, Any]) -> tuple[dict[int, int], int | None]:
    picks = [entry for entry in (match.get("picks_bans") or []) if entry.get("is_pick")]
    first_by_team: dict[int, int] = {}
    for entry in picks:
        team = entry.get("team")
        hero_id = entry.get("hero_id")
        if isinstance(team, int) and isinstance(hero_id, int) and team not in first_by_team:
            first_by_team[team] = hero_id
    last_hero = picks[-1].get("hero_id") if picks else None
    return first_by_team, last_hero


def add_title_stats(
    league_record: dict[str, Any],
    player: dict[str, Any],
    heroes: dict[str, Any],
    hero_mastery: dict[int, int],
    first_by_team: dict[int, int],
    last_hero: int | None,
) -> None:
    hero_id = int(player.get("hero_id") or 0)
    hero = heroes.get(str(hero_id), {})
    titles = league_record["titles"]

    cosmetics = player.get("cosmetics") or []
    if any(cosmetic.get("item_rarity") == "arcana" for cosmetic in cosmetics):
        titles["games_with_arcana"] += 1

    team_number = player.get("team_number")
    if team_number is None:
        team_number = 0 if player.get("player_slot", 0) < 128 else 1
    if first_by_team.get(int(team_number)) == hero_id:
        titles["first_pick"] += 1
    if last_hero == hero_id:
        titles["last_pick"] += 1

    if hero_mastery.get(hero_id, 0) >= 25:
        titles["games_with_hero_master"] += 1

    attribute = hero.get("attr")
    if attribute in {"str", "agi", "int", "all"}:
        titles[attribute] += 1

    flags = {
        "green": "isgreen",
        "blue": "isblue",
        "red": "isred",
        "undead": "isundead",
        "horns": "ishorns",
        "bearded": "isbearded",
        "aquatic": "isaquatic",
    }
    for title_key, hero_key in flags.items():
        if hero.get(hero_key):
            titles[title_key] += 1


def add_player_stats(
    league_record: dict[str, Any],
    player: dict[str, Any],
    active_items: set[int],
    lowest_networth: list[dict[str, Any]],
    most_deaths: list[dict[str, Any]],
    most_assists: list[dict[str, Any]],
    top_chatwheel_players: set[int],
) -> None:
    stats = league_record["stats"]
    subtitles = league_record["subtitles"]

    if player in lowest_networth:
        subtitles["lowest_networth"] += 1
    if player in most_deaths:
        subtitles["most_deaths"] += 1
    if player in most_assists:
        subtitles["most_assists"] += 1
    if player.get("player_slot") in top_chatwheel_players:
        subtitles["most_voice_lines"] += 1
    if player.get("lose"):
        subtitles["lost_games"] += 1

    active_count = sum(
        1 for slot in range(6) if int(player.get(f"item_{slot}") or 0) in active_items
    )
    if active_count >= 4:
        subtitles["4+_active_items"] += 1

    inventory = [int(player.get(f"item_{slot}") or 0) for slot in range(6)]
    backpack = [int(player.get(f"backpack_{slot}") or 0) for slot in range(3)]
    if all(inventory) and all(backpack):
        subtitles["9_slots"] += 1

    buyback_log = player.get("buyback_log") or []
    if buyback_log and int(buyback_log[0].get("time") or 10**9) < 1800:
        subtitles["bbs_before_30min"] += 1

    if "red" in stats:
        stats["red"]["kills"].append(float(player.get("kills") or 0))
        if int(player.get("kills") or 0) == 0:
            subtitles["0_kills"] += 1
        stats["red"]["deaths"].append(float(player.get("deaths") or 0))
        stats["red"]["creep_score"].append(
            float(player.get("last_hits") or 0) + float(player.get("denies") or 0)
        )
        stats["red"]["gpm"].append(float(player.get("gold_per_min") or 0))
        stats["red"]["madstone_collected"].append(
            float((player.get("item_uses") or {}).get("madstone_bundle", 0))
        )
        stats["red"]["tower_kills"].append(float(player.get("towers_killed") or 0))

    if "blue" in stats:
        stats["blue"]["obs_placed"].append(float(player.get("obs_placed") or 0))
        stats["blue"]["camps_stacked"].append(float(player.get("camps_stacked") or 0))
        stats["blue"]["runes_grabbed"].append(float(player.get("rune_pickups") or 0))
        stats["blue"]["watchers_taken"].append(
            float((player.get("ability_uses") or {}).get("ability_lamp_use", 0))
        )
        stats["blue"]["smokes_used"].append(
            float((player.get("item_uses") or {}).get("smoke_of_deceit", 0))
        )

    green = stats["green"]
    green["roshan_kills"].append(float(player.get("roshans_killed") or 0))
    green["teamfight_participation"].append(
        float(player.get("teamfight_participation") or 0)
    )
    green["stuns"].append(float(player.get("stuns") or 0))
    green["courier_kills"].append(float(player.get("courier_kills") or 0))
    green["firstblood"].append(float(player.get("firstblood_claimed") or 0))
    green["tormentor_kills"].append(
        float((player.get("killed") or {}).get("npc_dota_miniboss", 0))
    )


def process_match(
    match: dict[str, Any],
    league_id: str,
    player_stats: dict[str, Any],
    roster_by_name: dict[str, dict[str, Any]],
    alias_to_name: dict[str, str],
    heroes: dict[str, Any],
    active_items: set[int],
    firstblood_time: int | float | None,
    hero_mastery: dict[int, int],
    team_logos: dict[str, Any],
) -> dict[str, bool]:
    players = match.get("players") or []
    if not players:
        raise ValueError("OpenDota response has no players array")

    max_assists = max(float(p.get("assists") or 0) for p in players)
    max_deaths = max(float(p.get("deaths") or 0) for p in players)
    min_networth = min(float(p.get("net_worth") or 0) for p in players)
    most_assists = [p for p in players if float(p.get("assists") or 0) == max_assists]
    most_deaths = [p for p in players if float(p.get("deaths") or 0) == max_deaths]
    lowest_networth = [p for p in players if float(p.get("net_worth") or 0) == min_networth]

    chat_counts = Counter(
        event.get("player_slot")
        for event in (match.get("chat") or [])
        if event.get("type") == "chatwheel" and event.get("player_slot") is not None
    )
    top_chatwheel_players: set[int] = set()
    if chat_counts:
        maximum = max(chat_counts.values())
        top_chatwheel_players = {
            int(slot) for slot, count in chat_counts.items() if count == maximum
        }

    first_by_team, last_hero = pick_first_and_last(match)

    for player in players:
        visible_name = player.get("name") or player.get("personaname")
        canonical = alias_to_name.get(normalize_name(visible_name))
        if not canonical:
            continue
        roster_player = roster_by_name[canonical]
        league_record = ensure_player(
            player_stats, roster_player, league_id, player, match, team_logos
        )
        add_player_stats(
            league_record,
            player,
            active_items,
            lowest_networth,
            most_deaths,
            most_assists,
            top_chatwheel_players,
        )
        add_title_stats(
            league_record,
            player,
            heroes,
            hero_mastery,
            first_by_team,
            last_hero,
        )

    tormentor_death = any(
        float((player.get("killed_by") or {}).get("npc_dota_miniboss", 0)) > 0
        for player in players
    )
    return {
        "tormentor_death": tormentor_death,
        "firstblood_after_10": firstblood_time is not None and firstblood_time > 600,
        "firstblood_before_horn": firstblood_time is not None and firstblood_time < 0,
        "under_25": 0 < float(match.get("duration") or 0) < 1500,
    }


def main() -> None:
    args = parse_args()
    load_dotenv(ROOT / ".env")

    token = os.getenv("STRATZ_TOKEN", "").strip()
    use_stratz = bool(token) and not args.skip_stratz
    if not use_stratz:
        print("[warning] STRATZ is disabled; hero mastery data will stay at zero.")

    session = make_session()
    leagues = read_json(ROOT / "leagues.json", {})
    tier2_catalog = read_json(ROOT / "tier2_catalog.json", {})
    tier2_ids = sync_optional_leagues(session, leagues, tier2_catalog, args.delay)

    today = datetime.now(timezone.utc).date()
    for league in leagues.values():
        try:
            start = datetime.fromisoformat(league["start_date"]).date()
            end = datetime.fromisoformat(league["end_date"]).date()
            league["status"] = "upcoming" if today < start else "ongoing" if today <= end else "completed"
        except (KeyError, TypeError, ValueError):
            pass
    roster_data = read_json(ROOT / "players.json", {})
    heroes = read_json(ROOT / "heroes.json", {})
    active_items = set(int(item) for item in read_json(ROOT / "active_items.json", []))
    player_stats = read_json(ROOT / "players_stat.json", {})
    team_logos = read_json(TEAM_LOGOS_PATH, {"teams": {}})

    roster_by_name, alias_to_name = build_roster_maps(roster_data)
    for roster_player in roster_by_name.values():
        player_stats.setdefault(
            roster_player["name"],
            {
                "general": {
                    "team_name": roster_player["team"],
                    "team_logo": "",
                    "pos": roster_player["pos"],
                    "position": roster_player["position"],
                }
            },
        )
    apply_canonical_team_logos(player_stats, roster_by_name, team_logos)

    selected_ids = tier2_ids if args.tier2_only else (args.league or list(leagues.keys()))
    if args.tier2_only and not selected_ids:
        raise SystemExit("No Tier-2 tournaments were resolved. Check OpenDota availability and tier2_catalog.json.")
    unknown = [league_id for league_id in selected_ids if league_id not in leagues]
    if unknown:
        raise SystemExit(f"Unknown league ID(s): {', '.join(unknown)}")

    if args.reset:
        reset_selected_leagues(player_stats, leagues, selected_ids)

    scraper = cloudscraper.create_scraper()
    OPENDOTA_CACHE.mkdir(parents=True, exist_ok=True)
    STRATZ_CACHE.mkdir(parents=True, exist_ok=True)

    for league_id in selected_ids:
        league = leagues[league_id]
        print(f"\n[{league_id}] {league['name']}")
        matches_url = f"{OPENDOTA_BASE}/leagues/{league_id}/matches"
        matches_cache = OPENDOTA_CACHE / f"league_{league_id}_matches.json"
        # Always refresh the league list because ongoing tournaments gain matches.
        if matches_cache.exists():
            matches_cache.unlink()
        matches = cached_get_json(session, matches_url, matches_cache, args.delay)
        if not isinstance(matches, list):
            print(f"  skipped: unexpected league response: {matches}")
            continue

        if args.limit > 0:
            matches = matches[: args.limit]

        processed = {int(match_id) for match_id in league.get("processed_match_ids", [])}
        new_count = 0
        failed_count = 0

        for index, summary in enumerate(matches, start=1):
            match_id = int(summary["match_id"])
            if match_id in processed:
                continue

            try:
                match = cached_get_json(
                    session,
                    f"{OPENDOTA_BASE}/matches/{match_id}",
                    OPENDOTA_CACHE / f"match_{match_id}.json",
                    args.delay,
                )

                firstblood_time = match.get("first_blood_time")
                hero_mastery: dict[int, int] = {}
                if use_stratz:
                    stratz = fetch_stratz_match(scraper, match_id, token, args.delay)
                    stratz_match = ((stratz.get("data") or {}).get("match") or {})
                    if stratz_match.get("firstBloodTime") is not None:
                        firstblood_time = stratz_match["firstBloodTime"]
                    hero_mastery = {
                        int(player.get("heroId") or 0): int(
                            ((player.get("dotaPlus") or {}).get("level") or 0)
                        )
                        for player in (stratz_match.get("players") or [])
                    }

                flags = process_match(
                    match,
                    league_id,
                    player_stats,
                    roster_by_name,
                    alias_to_name,
                    heroes,
                    active_items,
                    firstblood_time,
                    hero_mastery,
                    team_logos,
                )

                if flags["tormentor_death"]:
                    league["total_deaths_from_torm"] += 1
                if flags["firstblood_after_10"]:
                    league["firstblood_before_10min"] += 1
                if flags["firstblood_before_horn"]:
                    league["firstblood_before_horn"] += 1
                if flags["under_25"]:
                    league["games<25min"] += 1

                processed.add(match_id)
                league["total_matches_parsed"] = len(processed)
                league["processed_match_ids"] = sorted(processed)
                new_count += 1
                print(f"  {index}/{len(matches)} match {match_id} parsed")

                if new_count % 10 == 0:
                    apply_canonical_team_logos(player_stats, roster_by_name, team_logos)
                    write_json(ROOT / "players_stat.json", player_stats)
                    write_json(ROOT / "leagues.json", leagues)
                    write_json(TEAM_LOGOS_PATH, team_logos)

            except Exception as exc:  # noqa: BLE001 - keep long batch jobs moving
                failed_count += 1
                print(f"  {index}/{len(matches)} match {match_id} failed: {exc}")

        apply_canonical_team_logos(player_stats, roster_by_name, team_logos)
        write_json(ROOT / "players_stat.json", player_stats)
        write_json(ROOT / "leagues.json", leagues)
        write_json(TEAM_LOGOS_PATH, team_logos)
        print(
            f"  done: {new_count} new, {len(processed)} total parsed, "
            f"{failed_count} failed"
        )

    meta = {
        "event": roster_data.get("event", "The International 2026"),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "leagues": list(leagues.keys()),
        "updated_leagues": selected_ids,
        "players": len(roster_by_name),
        "stratz_enabled": use_stratz,
    }
    apply_canonical_team_logos(player_stats, roster_by_name, team_logos)
    write_json(ROOT / "players_stat.json", player_stats)
    write_json(TEAM_LOGOS_PATH, team_logos)
    write_json(ROOT / "dataset_meta.json", meta)
    print("\nDataset saved to players_stat.json and leagues.json")


if __name__ == "__main__":
    main()
