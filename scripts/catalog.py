"""Shared reader for the species catalog: one JSON file per region under scripts/data/, in Pokédex order."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
regions = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova']


def region_path(region):
    return root / f'scripts/data/{region}.json'


def load_catalog():
    return [{**entry, 'region': region} for region in regions for entry in json.loads(region_path(region).read_text())]


def load_species_rules():
    return json.loads((root / 'scripts/data/species-rules.json').read_text())
