"""Shared reader for the PokeAPI evolution rows of Generations I-V and the PokéType rule each species pair follows (docs/PROGRESSION.md "Evolution").
Rules: babies never evolve by level; friendship, move and location evolutions happen at a level set in gameConfig.evolution;
a held or traded item becomes an item used from the collection; Magnezone and Probopass use the Thunder Stone; pure trades wait for trading.
"""
from urllib.request import urlopen
import csv
import io
from catalog import load_catalog, load_species_rules

csv_source = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
level_up, trade, use_item = '1', '2', '3'
last_generation = 5
location_stones = {'magnezone': 'thunder-stone', 'probopass': 'thunder-stone'}


def read_csv(name):
    with urlopen(csv_source + name, timeout=30) as response:
        return list(csv.DictReader(io.StringIO(response.read().decode('utf-8'))))


catalog = load_catalog()
species_of = {entry['dex']: entry['species'] for entry in catalog}
evolves_from = {entry['dex']: entry['evolvesFrom'] for entry in catalog}
babies = set(load_species_rules()['babies'])
item_names = {row['id']: row['identifier'] for row in read_csv('items.csv')}
version_generation = {row['id']: int(row['generation_id']) for row in read_csv('version_groups.csv')}


# Rows of the games up to Black 2 / White 2 only, earliest generation first; later games add regional forms and new methods.
def rows_by_pair():
    pairs = {}
    rows = [row for row in read_csv('pokemon_evolution.csv') if int(row['evolved_species_id']) in evolves_from]
    for row in sorted(rows, key=lambda row: version_generation[row['version_group_id']]):
        into = int(row['evolved_species_id'])
        if evolves_from[into] is not None and version_generation[row['version_group_id']] <= last_generation:
            pairs.setdefault((evolves_from[into], into), []).append(row)
    return pairs


def evolution_item(rows, into):
    if species_of[into] in location_stones:
        return location_stones[species_of[into]]
    for row in rows:
        if row['evolution_trigger_id'] == use_item and row['trigger_item_id']:
            return item_names[row['trigger_item_id']]
        if row['evolution_trigger_id'] in (trade, level_up) and row['held_item_id']:
            return item_names[row['held_item_id']]
    return None


# One of: ('item', id), ('level', minimum level), ('friendship',), ('move',), ('location',), or None when the pair waits (trade, shed, baby).
def rule_of(pair, rows):
    item = evolution_item(rows, pair[1])
    if item:
        return ('item', item)
    if species_of[pair[0]] in babies:
        return None
    level_rows = [row for row in rows if row['evolution_trigger_id'] == level_up]
    if not level_rows:
        return None
    first = level_rows[0]
    if first['minimum_happiness']:
        return ('friendship',)
    if first['known_move_id'] or first['known_move_type_id']:
        return ('move',)
    if first['location_id']:
        return ('location',)
    return ('level', int(first['minimum_level'])) if first['minimum_level'] else None


def evolution_rules():
    return {pair: rule for pair, rows in rows_by_pair().items() if (rule := rule_of(pair, rows)) is not None}
