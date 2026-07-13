import requests
import json
import time

filename = 'heroes.json'

try:
    with open(filename, 'r', encoding='utf-8') as f:
        heroes_info = json.load(f)
except FileNotFoundError:
    heroes_info = {}

heroes = requests.get(f"https://api.opendota.com/api/heroes").json()

for hero in heroes:
    heroes_info[hero['id']] = {
        'name': hero['localized_name'],
        'attr': hero['primary_attr']
    }

with open(filename, "w", encoding="utf-8") as f:
    json.dump(heroes_info, f, ensure_ascii=False, indent=4)