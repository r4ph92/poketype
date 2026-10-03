"""Import unmodified sprite sheets, front artwork and source attribution for every catalog species (Pokédex #1-649).
A species without PMDCollab Idle and Walk sheets keeps only its front artwork; build-sprite-metadata.py marks it as a still sprite.
Regenerate with: python3 scripts/import-pokemon-sprites.py
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.error import HTTPError
from urllib.request import urlopen
import json
import time
import xml.etree.ElementTree as ET
from catalog import load_catalog, root

sprite_collab = 'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master'
front_source = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white'
catalog = load_catalog()


def download(url, path):
    if path.exists():
        return
    for attempt in range(3):
        try:
            with urlopen(url, timeout=30) as response:
                content = response.read()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
            return
        except HTTPError as error:
            if error.code == 404 or attempt == 2:
                raise
        except Exception:
            if attempt == 2:
                raise
        time.sleep(1)


def resolve_action(animations, state):
    animation = next((a for a in animations if a.findtext('Name') == state), None)
    while animation is not None and animation.findtext('CopyOf'):
        animation = next(a for a in animations if a.findtext('Name') == animation.findtext('CopyOf'))
    return animation


# Returns False when the species has no animated Idle and Walk upstream.
def import_animations(dex, folder):
    try:
        download(f'{sprite_collab}/sprite/{dex:04d}/AnimData.xml', folder / 'AnimData.xml')
    except HTTPError:
        return False
    download(f'{sprite_collab}/sprite/{dex:04d}/credits.txt', folder / 'credits.txt')
    animations = ET.parse(folder / 'AnimData.xml').getroot().find('Anims')
    actions = [resolve_action(animations, state) for state in ['Idle', 'Walk']]
    if any(action is None for action in actions):
        return False
    for action in actions:
        filename = action.findtext('Name') + '-Anim.png'
        download(f'{sprite_collab}/sprite/{dex:04d}/{filename}', folder / filename)
    return True


def import_species(entry):
    dex, name = entry['dex'], entry['species']
    download(f'{front_source}/{dex}.png', root / f'public/assets/sprites/pokemon/front/{dex}.png')
    return name, import_animations(dex, root / 'public/assets/sprites/pokemon' / name)


# Contributor names change upstream, so this list is always fetched again.
with urlopen(f'{sprite_collab}/credit_names.txt', timeout=30) as response:
    (root / 'scripts/data/sprite-credit-names.txt').write_bytes(response.read())
errors, stills = [], []
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {pool.submit(import_species, entry): entry['species'] for entry in catalog}
    for index, future in enumerate(as_completed(futures), 1):
        try:
            name, animated = future.result()
            if not animated:
                stills.append(name)
        except Exception as error:
            errors.append((futures[future], str(error)))
        if index % 50 == 0:
            print(f'Checked {index}/{len(catalog)} species', flush=True)
if errors:
    raise SystemExit(json.dumps(errors, indent=2))
print(f'{len(catalog)} species imported; still sprite only: {sorted(stills) or "none"}')
