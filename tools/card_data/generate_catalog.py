"""Generate and verify offline artifacts without changing the application's inputs."""
import argparse
import copy
from dataclasses import dataclass
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sys
import tempfile

SCHEMA_VERSION = 3
DETAIL_SPLIT_THRESHOLD_BYTES = 384 * 1024
DETAIL_TARGET_BYTES = 128 * 1024
# Preserve rule/identity inputs conservatively. Only display details and unknown
# extension fields are omitted here; complete records remain in detail files.
INDEX_FIELDS = (
    'id', 'name', 'image', 'class', 'title', 'type', 'subtype', 'rarity',
    'product_name', 'cost', 'atk', 'hp', 'card_kind_normalized', 'deck_section',
    'is_token', 'is_evolve_card', 'is_deck_build_legal', 'catalog_status', 'related_cards',
)
DEFAULT_RELEASED = Path('public/cards_detailed.json')
DEFAULT_PREVIEW = Path('public/cards_preview.json')
DEFAULT_OUTPUT = Path('artifacts/card-catalog')


def json_bytes(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True,
                       separators=(',', ':'), allow_nan=False) + '\n').encode('utf-8')


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sizes(data: bytes) -> dict:
    return {'bytes': len(data), 'gzipBytes': len(gzip.compress(data, mtime=0))}


def group_for(card_id: str) -> str:
    group = card_id.split('-', 1)[0]
    if not re.fullmatch(r'[A-Za-z0-9_]+', group):
        raise ValueError(f'Unsafe detail group for card ID: {card_id}')
    return group


def validate_cards(cards, label: str) -> None:
    if not isinstance(cards, list):
        raise ValueError(f'{label} must be an array of card objects')
    ids = set()
    for card in cards:
        if not isinstance(card, dict):
            raise ValueError(f'{label} contains a non-object card')
        for field in ('id', 'name'):
            if not isinstance(card.get(field), str) or not card[field].strip():
                raise ValueError(f'{label} contains a missing or invalid {field}')
        if card['id'] in ids:
            raise ValueError(f'{label} contains duplicate ID: {card["id"]}')
        ids.add(card['id'])
        group_for(card['id'])
        if 'image' in card and not isinstance(card['image'], str):
            raise ValueError(f'{card["id"]}: image must be a string')
        related = card.get('related_cards', [])
        if not isinstance(related, list) or any(
            not isinstance(ref, dict) or not isinstance(ref.get('id'), str) or not ref['id']
            for ref in related
        ):
            raise ValueError(f'{card["id"]}: invalid related_cards')
        faces = card.get('faces', [])
        if not isinstance(faces, list) or any(not isinstance(face, dict) for face in faces):
            raise ValueError(f'{card["id"]}: invalid faces')


def index_card(card: dict, group=None) -> dict:
    return {**{key: copy.deepcopy(card[key]) for key in INDEX_FIELDS if key in card},
            'detail_group': group_for(card['id']) if group is None else group}


INDEX_COLUMNS = (*INDEX_FIELDS, 'detail_group')


def encode_index(index: list[dict]) -> dict:
    """Only the wire representation changes; preserve value types and absence."""
    rows = []
    required = {'id', 'name', 'detail_group'}
    for entry in index:
        if not isinstance(entry, dict) or not required <= entry.keys() or entry.keys() - set(INDEX_COLUMNS):
            raise ValueError('Invalid compact index fields')
        mask = sum(1 << bit for bit, key in enumerate(INDEX_COLUMNS) if key in entry)
        rows.append([mask, *(copy.deepcopy(entry[key]) for key in INDEX_COLUMNS if key in entry)])
    return {'encoding': 'rows-v1', 'fields': list(INDEX_COLUMNS), 'rows': rows}


def decode_index(value) -> list[dict]:
    if (not isinstance(value, dict) or set(value) != {'encoding', 'fields', 'rows'}
            or value['encoding'] != 'rows-v1' or value['fields'] != list(INDEX_COLUMNS)
            or not isinstance(value['rows'], list)):
        raise ValueError('Invalid compact index envelope')
    result = []
    required = 3 + (1 << (len(INDEX_COLUMNS) - 1))
    for row in value['rows']:
        if (not isinstance(row, list) or not row or type(row[0]) is not int
                or row[0] < 0 or row[0] >= 1 << len(INDEX_COLUMNS) or row[0] & required != required):
            raise ValueError('Invalid compact index mask')
        keys = [key for bit, key in enumerate(INDEX_COLUMNS) if row[0] & (1 << bit)]
        if len(row) != len(keys) + 1:
            raise ValueError('Invalid compact index row length')
        result.append(dict(zip(keys, copy.deepcopy(row[1:]))))
    return result


def partition_cards(cards, *, max_bytes=None, max_cards=None):
    """Keep whole records in stable order; include JSON delimiters and newline."""
    pieces, part = [], []
    part_bytes = 3
    for card in cards:
        card_bytes = len(json_bytes(card)) - 1
        if part and ((max_cards is not None and len(part) >= max_cards)
                     or (max_bytes is not None and part_bytes + card_bytes + bool(part) > max_bytes)):
            pieces.append(part)
            part, part_bytes = [], 3
        part_bytes += card_bytes + bool(part)
        part.append(card)
    if part:
        pieces.append(part)
    return pieces


def reassemble_catalog(index: list[dict], details: dict[str, list[dict]]) -> list[dict]:
    validate_cards(index, 'index')
    assigned = {}
    products = {}
    for group in details:
        match = re.fullmatch(r'([A-Za-z0-9_]+)(?:@([0-9]{4}|[1-9][0-9]{4,}))?', group)
        if not match or match[2] == '0000':
            raise ValueError(f'Unsafe detail group: {group}')
        products.setdefault(match[1], set()).add(group)
    for product, groups in products.items():
        expected = {product} if product in groups else {f'{product}@{part:04}' for part in range(1, len(groups) + 1)}
        if groups != expected:
            raise ValueError('Mixed or noncontiguous detail groups')
    for entry in index:
        group = entry.get('detail_group')
        if (not isinstance(group, str) or group not in details
                or group.split('@', 1)[0] != group_for(entry['id'])):
            raise ValueError('Invalid index detail assignment')
        assigned[entry['id']] = group
    by_id = {}
    for group, cards in details.items():
        if not cards:
            raise ValueError('Empty detail group')
        validate_cards(cards, f'detail group {group}')
        for card in cards:
            if assigned.get(card['id']) != group or card['id'] in by_id:
                raise ValueError(f'Duplicate or misplaced detail ID: {card["id"]}')
            by_id[card['id']] = card
    if set(by_id) != {card['id'] for card in index}:
        raise ValueError('Index and detail IDs do not match')
    result = []
    for entry in index:
        card = by_id[entry['id']]
        if json_bytes(index_card(card, assigned[entry['id']])) != json_bytes(entry):
            raise ValueError(f'Index and detail values differ: {entry["id"]}')
        result.append(copy.deepcopy(card))
    return result


@dataclass(frozen=True)
class CatalogArtifacts:
    files: dict[str, bytes]
    manifest: dict

    @property
    def manifest_bytes(self) -> bytes:
        return json_bytes(self.manifest)


def build_catalog(released, preview) -> CatalogArtifacts:
    validate_cards(released, 'released')
    validate_cards(preview, 'preview')
    released_ids = {card['id'] for card in released}
    merged = [{**copy.deepcopy(card), 'catalog_status': 'released'} for card in released]
    preview_only = [card for card in preview if card['id'] not in released_ids]
    merged.extend({**copy.deepcopy(card), 'catalog_status': 'preview'} for card in preview_only)
    ids = {card['id'] for card in merged}
    for card in merged:
        for related in card.get('related_cards', []):
            if related['id'] not in ids:
                raise ValueError(f'{card["id"]}: unresolved related card {related["id"]}')
    products = {}
    for card in merged:
        products.setdefault(group_for(card['id']), []).append(card)
    details = {}
    for product, cards in products.items():
        pieces = partition_cards(cards, max_bytes=DETAIL_TARGET_BYTES) if len(json_bytes(cards)) > DETAIL_SPLIT_THRESHOLD_BYTES else [cards]
        for part, piece in enumerate(pieces, 1):
            group = product if len(pieces) == 1 else f'{product}@{part:04}'
            details[group] = piece
    assigned = {card['id']: group for group, cards in details.items() for card in cards}
    index = [index_card(card, assigned[card['id']]) for card in merged]
    if json_bytes(reassemble_catalog(index, details)) != json_bytes(merged):
        raise ValueError('Catalog round-trip verification failed')
    compact_index = encode_index(index)
    if json_bytes(decode_index(compact_index)) != json_bytes(index):
        raise ValueError('Compact index round-trip verification failed')
    files = {'index.json': json_bytes(compact_index)}
    files.update({f'details/{group}.json': json_bytes(cards) for group, cards in sorted(details.items())})
    version = sha256(json_bytes({'schemaVersion': SCHEMA_VERSION,
                                'files': {name: sha256(data) for name, data in files.items()}}))

    def descriptor(name, count):
        data = files[name]
        return {'file': f'versions/{version}/{name}', 'sha256': sha256(data),
                'count': count, **sizes(data)}

    detail_descriptors = {group: descriptor(f'details/{group}.json', len(cards))
                          for group, cards in sorted(details.items())}
    manifest = {
        'schemaVersion': SCHEMA_VERSION, 'catalogVersion': version,
        'counts': {'released': len(released), 'preview': len(preview_only), 'total': len(merged)},
        'index': descriptor('index.json', len(index)), 'details': detail_descriptors,
        'report': {
            'fullCatalog': sizes(json_bytes(merged)),
            'objectIndex': sizes(json_bytes(index)),
            'detailGroups': len(details),
            'detailBytes': sum(value['bytes'] for value in detail_descriptors.values()),
            'detailGzipBytes': sum(value['gzipBytes'] for value in detail_descriptors.values()),
        },
    }
    return CatalogArtifacts(files, manifest)


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Duplicate JSON field: {key}')
        result[key] = value
    return result


def reject_constant(value):
    raise ValueError(f'Invalid JSON constant: {value}')


def read_inputs(released_path: Path, preview_path: Path):
    snapshots = {path: path.read_bytes() for path in (released_path, preview_path)}
    try:
        cards = [json.loads(snapshots[path], object_pairs_hook=unique_object,
                            parse_constant=reject_constant) for path in (released_path, preview_path)]
    except (ValueError, UnicodeError) as error:
        raise ValueError(f'Invalid catalog JSON: {error}') from error
    return build_catalog(*cards), snapshots


def verify_version(folder: Path, bundle: CatalogArtifacts) -> None:
    actual = {path.relative_to(folder).as_posix() for path in folder.rglob('*') if path.is_file()}
    if actual != set(bundle.files):
        raise ValueError('Generated version contains missing or unexpected files')
    for name, expected in bundle.files.items():
        if (folder / name).read_bytes() != expected:
            raise ValueError(f'Generated artifact is stale or corrupt: {name}')


def check_catalog(released_path: Path, preview_path: Path, output: Path) -> CatalogArtifacts:
    bundle, _ = read_inputs(released_path, preview_path)
    manifest = output / 'manifest.json'
    if not manifest.is_file() or manifest.read_bytes() != bundle.manifest_bytes:
        raise ValueError('Generated manifest is missing, stale, or corrupt; generate the catalog first')
    verify_version(output / 'versions' / bundle.manifest['catalogVersion'], bundle)
    return bundle


def validate_output_manifest(root: Path) -> None:
    manifest = root / 'manifest.json'
    if not manifest.exists():
        return
    try:
        value = json.loads(manifest.read_bytes())
    except (ValueError, UnicodeError) as error:
        raise ValueError('Existing output manifest is invalid; use a separate output directory') from error
    if not isinstance(value, dict):
        raise ValueError('Output contains an unrelated manifest')
    version = value.get('catalogVersion')
    index = value.get('index')
    if (value.get('schemaVersion') not in (1, 2, SCHEMA_VERSION)
            or not isinstance(version, str) or not re.fullmatch(r'[a-f0-9]{64}', version)
            or not isinstance(index, dict) or index.get('file') != f'versions/{version}/index.json'
            or not isinstance(value.get('details'), dict) or not isinstance(value.get('counts'), dict)):
        raise ValueError('Output contains an unrelated or unsupported manifest')


def generate_catalog(released_path: Path, preview_path: Path, output: Path) -> CatalogArtifacts:
    root = output.resolve()
    if any(root == path.resolve() or root in path.resolve().parents
           for path in (released_path, preview_path)):
        raise ValueError('Output directory must not contain input catalogs')
    bundle, snapshots = read_inputs(released_path, preview_path)
    validate_output_manifest(root)
    root.mkdir(parents=True, exist_ok=True)
    versions = root / 'versions'
    versions.mkdir(exist_ok=True)
    target = versions / bundle.manifest['catalogVersion']
    staging = None
    pointer = None
    try:
        if target.exists():
            # Published versions are immutable. Never silently repair/overwrite them.
            verify_version(target, bundle)
        else:
            staging = Path(tempfile.mkdtemp(prefix='.catalog-stage-', dir=root))
            for name, data in bundle.files.items():
                destination = staging / name
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
            verify_version(staging, bundle)
            os.rename(staging, target)
            staging = None
        if any(path.read_bytes() != data for path, data in snapshots.items()):
            raise ValueError('Input catalogs changed during generation; retry with stable inputs')
        manifest = root / 'manifest.json'
        if manifest.exists() and manifest.read_bytes() == bundle.manifest_bytes:
            return bundle
        with tempfile.NamedTemporaryFile(prefix='.catalog-manifest-', dir=root, delete=False) as handle:
            pointer = Path(handle.name)
            handle.write(bundle.manifest_bytes)
            handle.flush()
            os.fsync(handle.fileno())
        # This is the only publication point, after every referenced file is verified.
        os.replace(pointer, manifest)
        pointer = None
    finally:
        if staging is not None:
            shutil.rmtree(staging)
        if pointer is not None:
            pointer.unlink(missing_ok=True)
    return bundle


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--released', type=Path, default=DEFAULT_RELEASED)
    parser.add_argument('--preview', type=Path, default=DEFAULT_PREVIEW)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--check', action='store_true', help='Verify existing artifacts without writing')
    args = parser.parse_args(argv)
    try:
        operation = check_catalog if args.check else generate_catalog
        bundle = operation(args.released, args.preview, args.output)
    except (ValueError, OSError) as error:
        print(f'Card catalog generation failed: {error}', file=sys.stderr)
        return 1
    print(json.dumps({'catalogVersion': bundle.manifest['catalogVersion'],
                      'counts': bundle.manifest['counts'], 'index': bundle.manifest['index'],
                      'report': bundle.manifest['report']}, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
