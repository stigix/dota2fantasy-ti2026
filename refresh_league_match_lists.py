from __future__ import annotations

import json
import time
from pathlib import Path

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

ROOT = Path(__file__).resolve().parent
CACHE = ROOT / ".cache" / "opendota"
LEAGUES = ROOT / "leagues.json"
API = "https://api.opendota.com/api"


def main() -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    leagues = json.loads(LEAGUES.read_text(encoding="utf-8"))

    session = requests.Session()
    retries = Retry(total=4, backoff_factor=1.0, status_forcelist=(429, 500, 502, 503, 504))
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update({"User-Agent": "dota2fantasy-ti2026-standings/1.0"})

    ok = 0
    for league_id in sorted(leagues.keys(), key=lambda x: int(x) if str(x).isdigit() else 0):
        path = CACHE / f"league_{league_id}_matches.json"
        url = f"{API}/leagues/{league_id}/matches"
        try:
            r = session.get(url, timeout=45)
            r.raise_for_status()
            data = r.json()
            if not isinstance(data, list):
                print(f"  skip {league_id}: not a list")
                continue
            path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            ok += 1
            print(f"  {league_id}: {len(data)} matches")
            time.sleep(0.8)
        except Exception as exc:
            print(f"  {league_id} failed: {exc}")

    print(f"Refreshed {ok}/{len(leagues)} league match lists → {CACHE}")


if __name__ == "__main__":
    main()