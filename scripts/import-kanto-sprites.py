"""Import unmodified sprite sheets and source attribution for the Kanto catalog."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.request import urlopen
import json
import time
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parent.parent
catalog = json.loads((root / 'scripts/data/kanto.json').read_text())

def download(url, path):
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    for attempt in range(3):
        try:
            with urlopen(url, timeout=30) as response:
                content = response.read()
            path.write_bytes(content)
            return
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1)

def import_species(entry):
    dex, name = entry['dex'], entry['species']
    folder = root / 'public/assets/sprites/pokemon' / name
    for filename in ['AnimData.xml', 'credits.txt']:
        download(f'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/{dex:04d}/{filename}', folder / filename)
    animations = ET.parse(folder / 'AnimData.xml').getroot().find('Anims')
    for state in ['Idle', 'Walk']:
        animation = next(a for a in animations if a.findtext('Name') == state)
        while animation.findtext('CopyOf'):
            animation = next(a for a in animations if a.findtext('Name') == animation.findtext('CopyOf'))
        filename = animation.findtext('Name') + '-Anim.png'
        download(f'https://raw.githubusercontent.com/PMDCollab/SpriteCollab/master/sprite/{dex:04d}/{filename}', folder / filename)
    download(f'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/{dex}.png', root / f'public/assets/sprites/pokemon/front/{dex}.png')
    return name

errors = []
with ThreadPoolExecutor(max_workers=8) as pool:
    futures = {pool.submit(import_species, entry): entry['species'] for entry in catalog}
    for index, future in enumerate(as_completed(futures), 1):
        try:
            future.result()
        except Exception as error:
            errors.append((futures[future], str(error)))
        if index % 25 == 0:
            print(f'Checked {index}/151 species', flush=True)
if errors:
    raise SystemExit(json.dumps(errors, indent=2))
print('All 151 species imported with Idle, Walk, XML, credits and front artwork.')
