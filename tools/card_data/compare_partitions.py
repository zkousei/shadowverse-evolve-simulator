"""Compare hypothetical detail partitions without producing deployable artifacts."""
import argparse
import copy
import json
from pathlib import Path
import sys

from .generate_catalog import (
    CatalogArtifacts, DEFAULT_PREVIEW, DEFAULT_RELEASED, check_catalog, decode_index,
    encode_index, json_bytes, read_inputs, reject_constant, sha256, sizes, unique_object,
)
from .measure_catalog import exported_deck_ids, measure_catalog


def _positive_integer(value):
    if type(value) is not int or value < 1:
        raise ValueError('Partition limits must be positive integers')
    return value


def model_partition(bundle: CatalogArtifacts, *, max_cards=None, max_bytes=None) -> CatalogArtifacts:
    """In-memory size model only: current readers cannot load split group IDs.

    Keep current manifest/index structure to include mapping and descriptor costs.
    The eventual production protocol and its validation are a separate change.
    """
    if (max_cards is None) == (max_bytes is None):
        raise ValueError('Select exactly one of max_cards or max_bytes')
    _positive_integer(max_cards if max_cards is not None else max_bytes)
    groups = {}
    split = False
    for group in sorted(bundle.manifest['details']):
        cards = json.loads(bundle.files[f'details/{group}.json'])
        pieces = []
        part = []
        part_bytes = 3  # Array brackets plus json_bytes' final newline.
        for card in cards:
            card_bytes = len(json_bytes(card)) - 1
            exceeds_count = max_cards is not None and len(part) >= max_cards
            exceeds_bytes = max_bytes is not None and part_bytes + card_bytes + bool(part) > max_bytes
            if part and (exceeds_count or exceeds_bytes):
                pieces.append(part)
                part = []
                part_bytes = 3
            part_bytes += card_bytes + bool(part)
            part.append(card)
        if part:
            pieces.append(part)
        if len(pieces) == 1:
            groups[group] = pieces[0]
        else:
            split = True
            # '@' cannot occur in original product prefixes, avoiding collisions.
            for number, piece in enumerate(pieces, 1):
                groups[f'{group}@{number:04}'] = piece
    if not split:
        return copy.deepcopy(bundle)

    by_id = {card['id']: group for group, cards in groups.items() for card in cards}
    index = [{**card, 'detail_group': by_id[card['id']]}
             for card in decode_index(json.loads(bundle.files['index.json']))]
    files = {'index.json': json_bytes(encode_index(index))}
    files.update({f'details/{group}.json': json_bytes(cards) for group, cards in sorted(groups.items())})
    version = sha256(json_bytes({'schemaVersion': bundle.manifest['schemaVersion'],
                                'files': {name: sha256(data) for name, data in files.items()}}))

    def descriptor(name, count):
        data = files[name]
        return {'file': f'versions/{version}/{name}', 'sha256': sha256(data),
                'count': count, **sizes(data)}

    manifest = copy.deepcopy(bundle.manifest)
    descriptors = {group: descriptor(f'details/{group}.json', len(cards))
                   for group, cards in sorted(groups.items())}
    manifest.update(catalogVersion=version, index=descriptor('index.json', len(index)), details=descriptors)
    manifest['report'].update(
        objectIndex=sizes(json_bytes(index)), detailGroups=len(groups),
        detailBytes=sum(row['bytes'] for row in descriptors.values()),
        detailGzipBytes=sum(row['gzipBytes'] for row in descriptors.values()),
    )
    return CatalogArtifacts(files, manifest)


def compare_partitions(bundle: CatalogArtifacts, scenarios: dict, card_limits=(), byte_limits=()) -> dict:
    selections = {name: list(ids) for name, ids in scenarios.items()}
    policies = [('current', {}, bundle)]
    for key, limits in (('maxCards', card_limits), ('maxBytes', byte_limits)):
        checked = list(dict.fromkeys(_positive_integer(value) for value in limits))
        for limit in checked:
            kwargs = {'max_cards' if key == 'maxCards' else 'max_bytes': limit}
            policies.append((f'{key}-{limit}', {key: limit}, model_partition(bundle, **kwargs)))
    rows = []
    for name, limits, candidate in policies:
        measured = measure_catalog(candidate)
        descriptors = candidate.manifest['details'].values()
        rows.append({
            'name': name, 'limits': limits, 'detailGroups': len(candidate.manifest['details']),
            'maxGroupCards': max((row['count'] for row in descriptors), default=0),
            'maxGroupBytes': max((row['bytes'] for row in descriptors), default=0),
            'oversizedSingleCardGroups': sum(row['count'] == 1 and row['bytes'] > limits['maxBytes']
                                             for row in descriptors) if 'maxBytes' in limits else 0,
            'initial': measured['scenarios']['initial'], 'all': measured['scenarios']['all'],
            'selections': {key: measure_catalog(candidate, ids)['scenarios']['selected']
                           for key, ids in selections.items()},
        })
    return {'reportVersion': 1, 'comparisonOnly': True,
            'sourceCatalogVersion': bundle.manifest['catalogVersion'],
            'counts': dict(bundle.manifest['counts']), 'policies': rows}


def probe_selections(bundle: CatalogArtifacts) -> dict:
    """Synthetic ID selections, not filtered/paginated UI or legal deck claims."""
    index = decode_index(json.loads(bundle.files['index.json']))
    ids = [card['id'] for card in index]
    middle = max(0, (len(ids) - 50) // 2)
    largest = max(sorted(bundle.manifest['details']),
                  key=lambda group: bundle.manifest['details'][group]['count'], default=None)
    single = next(([card['id']] for card in index if card['detail_group'] == largest), [])
    return {'probe:index-first-50': ids[:50], 'probe:index-middle-50': ids[middle:middle + 50],
            'probe:index-last-50': ids[-50:], 'probe:largest-group-single': single}


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--released', type=Path, default=DEFAULT_RELEASED)
    parser.add_argument('--preview', type=Path, default=DEFAULT_PREVIEW)
    parser.add_argument('--deck', type=Path, action='append', default=[], help='Exported deck JSON; repeat for multiple scenarios')
    parser.add_argument('--include-probes', action='store_true', help='Also compare synthetic 50-ID index windows and one ID from the largest group')
    parser.add_argument('--check-output', type=Path, help='Verify the current real build, never write candidate artifacts')
    parser.add_argument('--max-cards', type=int, nargs='+', help='Candidate card caps (default: 64 128 256)')
    parser.add_argument('--max-bytes', type=int, nargs='+', help='Candidate UTF-8 byte caps (default: 65536 131072 262144)')
    args = parser.parse_args(argv)
    try:
        if args.check_output:
            bundle = check_catalog(args.released, args.preview, args.check_output)
        else:
            bundle, _ = read_inputs(args.released, args.preview)
        scenarios = probe_selections(bundle) if args.include_probes else {}
        for path in args.deck:
            key = str(path)
            if key in scenarios:
                raise ValueError(f'Duplicate deck scenario: {key}')
            value = json.loads(path.read_bytes(), object_pairs_hook=unique_object, parse_constant=reject_constant)
            scenarios[key] = exported_deck_ids(value)
        cards = args.max_cards or []
        byte_caps = args.max_bytes or []
        if args.max_cards is None and args.max_bytes is None:
            cards, byte_caps = [64, 128, 256], [65536, 131072, 262144]
        result = compare_partitions(bundle, scenarios, cards, byte_caps)
    except (ValueError, OSError, UnicodeError) as error:
        print(f'Card catalog partition comparison failed: {error}', file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
