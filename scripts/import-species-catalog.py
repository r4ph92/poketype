"""Build the species catalog for Pokédex #1-649 (Kanto to Unova) from PokeAPI species CSVs: official FR/EN names, the form each species
evolves from and its wild rarity tier from scripts/data/species-rules.json (common unless listed). Regenerate with: python3 scripts/import-species-catalog.py
"""
from urllib.request import urlopen
import csv
import io
import json
from catalog import region_path, regions, load_species_rules

csv_source = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
last_dex = 649
language_ids = {'fr': '5', 'en': '9'}


def read_csv(name):
    with urlopen(csv_source + name, timeout=30) as response:
        return list(csv.DictReader(io.StringIO(response.read().decode('utf-8'))))


species_rows = [row for row in read_csv('pokemon_species.csv') if int(row['id']) <= last_dex]
identifiers = {int(row['id']): row['identifier'] for row in species_rows}
names = {}
for row in read_csv('pokemon_species_names.csv'):
    for locale, language in language_ids.items():
        if row['local_language_id'] == language and int(row['pokemon_species_id']) <= last_dex:
            names.setdefault(int(row['pokemon_species_id']), {})[locale] = row['name']

rules = load_species_rules()
babies = set(rules['babies'])
never_wild = set(rules['badgeLegendaries'])
tier_of = {species: tier for tier, members in rules['tiers'].items() for species in members}


# A wild species is a base form, or the first evolution of a baby (babies never evolve, so Pikachu and Marill spawn as base forms).
def is_wild(species, evolves_from):
    if species in never_wild:
        return False
    return evolves_from is None or identifiers[evolves_from] in babies


def entry_of(row):
    dex, species = int(row['id']), row['identifier']
    evolves_from = int(row['evolves_from_species_id']) if row['evolves_from_species_id'] else None
    wild = is_wild(species, evolves_from)
    assert wild or species not in tier_of, (species, 'tier listed for a species that is never wild')
    rarity = tier_of.get(species, 'common') if wild else None
    return {'dex': dex, 'species': species, 'evolvesFrom': evolves_from, 'rarity': rarity, 'names': names[dex]}


assert set(tier_of) <= set(identifiers.values()), set(tier_of) - set(identifiers.values())
for generation, region in enumerate(regions, 1):
    entries = [entry_of(row) for row in species_rows if int(row['generation_id']) == generation]
    region_path(region).write_text(json.dumps(entries, indent=2, ensure_ascii=False) + '\n')
    print(f'{region}: {len(entries)} species')
