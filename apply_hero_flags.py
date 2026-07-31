import json
from pathlib import Path

path = Path("heroes.json")
data = json.loads(path.read_text(encoding="utf-8"))

# По официальным тултипам CHANGE TITLES (TI 2026)
FLAGS = {
    "isred": {  # Crimson
        "Axe", "Bloodseeker", "Bristleback", "Chaos Knight", "Clinkz",
        "Dawnbreaker", "Doom", "Dragon Knight", "Ember Spirit", "Huskar",
        "Kez", "Legion Commander", "Lifestealer", "Lina", "Lycan",
        "Marci", "Mars", "Monkey King", "Phoenix", "Primal Beast",
        "Queen of Pain", "Shadow Fiend", "Snapfire", "Sven", "Troll Warlord",
        "Ursa", "Wraith King",
    },
    "isblue": {  # Cerulean
        "Ancient Apparition", "Arc Warden", "Crystal Maiden", "Dark Willow",
        "Disruptor", "Drow Ranger", "Io", "Leshrac", "Lich", "Luna",
        "Morphling", "Muerta", "Outworld Destroyer", "Razor", "Riki",
        "Skywrath Mage", "Storm Spirit", "Tusk", "Winter Wyvern", "Zeus",
    },
    "isgreen": {  # Emerald
        "Beastmaster", "Broodmother", "Death Prophet", "Earth Spirit",
        "Enchantress", "Lone Druid", "Nature's Prophet", "Necrophos",
        "Nyx Assassin", "Pangolier", "Pudge", "Sand King", "Tidehunter",
        "Timbersaw", "Tiny", "Treant Protector", "Underlord", "Undying",
        "Venomancer", "Viper", "Weaver",
    },
    "ispurple": {  # Royal
        "Abaddon", "Anti-Mage", "Bane", "Dark Seer", "Enigma",
        "Faceless Void", "Grimstroke", "Invoker", "Night Stalker", "Oracle",
        "Ringmaster", "Rubick", "Shadow Demon", "Spectre", "Templar Assassin",
        "Void Spirit", "Warlock", "Witch Doctor",
    },
    "isyellow": {  # Golden (yellow or brown)
        "Alchemist", "Batrider", "Bounty Hunter", "Brewmaster", "Centaur Warrunner",
        "Clockwerk", "Earthshaker", "Elder Titan", "Gyrocopter", "Hoodwink",
        "Juggernaut", "Magnus", "Meepo", "Ogre Magi", "Sniper",
        "Spirit Breaker", "Techies", "Tinker",
    },
    "isaquatic": {  # Elemental = Aquatic / Fiery / Icy
        "Ancient Apparition", "Crystal Maiden", "Ember Spirit", "Jakiro",
        "Kunkka", "Leshrac", "Lich", "Lina", "Morphling", "Naga Siren",
        "Phoenix", "Slardar", "Slark", "Tidehunter", "Tusk", "Winter Wyvern",
    },
    "isundead": {  # Otherworldly = Undead / Demon / Spirit
        "Abaddon", "Ancient Apparition", "Bane", "Clinkz", "Death Prophet",
        "Doom", "Earth Spirit", "Ember Spirit", "Lich", "Lifestealer",
        "Muerta", "Necrophos", "Pugna", "Shadow Demon", "Shadow Fiend",
        "Spectre", "Storm Spirit", "Terrorblade", "Undying", "Vengeful Spirit",
        "Visage", "Void Spirit", "Wraith King",
    },
    "iscaped": {  # Heroic = Caped or Masked
        "Abaddon", "Anti-Mage", "Bounty Hunter", "Chen", "Clinkz",
        "Dawnbreaker", "Dragon Knight", "Drow Ranger", "Hoodwink", "Juggernaut",
        "Mars", "Muerta", "Omniknight", "Phantom Assassin", "Riki",
        "Skywrath Mage", "Templar Assassin", "Windranger", "Zeus",
    },
}

for hero in data.values():
    name = hero.get("name") or ""
    for flag, names in FLAGS.items():
        hero[flag] = name in names
    hero["isbrown"] = hero.get("isyellow", False)
    hero["ismasked"] = hero.get("iscaped", False)
    # старые поля, если где-то ещё читаются
    if "ishorns" not in hero:
        hero["ishorns"] = False
    if "isbearded" not in hero:
        hero["isbearded"] = False

path.write_text(json.dumps(data, ensure_ascii=False, indent=4), encoding="utf-8")

# контроль
for flag in FLAGS:
    n = sum(1 for h in data.values() if h.get(flag))
    print(f"{flag}: {n}")
print("OK")