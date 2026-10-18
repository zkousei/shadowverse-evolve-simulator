"""Measure catalog file sizes without writing inputs, artifacts, or reports."""
import argparse
import json
from pathlib import Path
import sys

from .generate_catalog import (
    CatalogArtifacts, DEFAULT_PREVIEW, DEFAULT_RELEASED, check_catalog, decode_index,
    json_bytes, read_inputs, reject_constant, sizes, unique_object,
)

DECK_SECTIONS = ('mainDeck', 'evolveDeck', 'leaderCards', 'tokenDeck')


def exported_deck_ids(value) -> list[str]:
    """Accept exported card arrays, not the private counted storage format."""
    if not isinstance(value, dict) or not any(key in value for key in DECK_SECTIONS):
        raise ValueError('Expected an exported deck with card array sections')
    result = []
    for section in DECK_SECTIONS:
        cards = value.get(section, [])
        if not isinstance(cards, list):
            raise ValueError(f'{section} must be a card array')
        for card in cards:
            if not isinstance(card, dict) or not isinstance(card.get('id'), str) or not card['id'].strip():
                raise ValueError(f'{section} contains a missing or invalid card ID')
            result.append(card['id'])
    return result


def measure_catalog(bundle: CatalogArtifacts, requested_ids=()) -> dict:
    index = decode_index(json.loads(bundle.files['index.json']))
    by_id = {card['id']: card for card in index}
    requested = list(requested_ids)
    if any(not isinstance(card_id, str) or not card_id.strip() for card_id in requested):
        raise ValueError('Requested card IDs must be non-empty strings')
    selected = list(dict.fromkeys(requested))
    missing = [card_id for card_id in selected if card_id not in by_id]
    if missing:
        raise ValueError(f'Unknown card IDs: {", ".join(missing)}')
    seen = set(selected)
    unique_requested = len(selected)
    # Match loadCardsWithRelated: follow the complete graph, including cycles,
    # without fetching a group more than once or losing caller arrival order.
    for card_id in selected:
        for ref in by_id[card_id].get('related_cards', []):
            if ref['id'] not in seen:
                seen.add(ref['id'])
                selected.append(ref['id'])
    selected_groups = list(dict.fromkeys(by_id[card_id]['detail_group'] for card_id in selected))
    file_sizes = {name: sizes(data) for name, data in bundle.files.items()}
    manifest_sizes = sizes(bundle.manifest_bytes)

    def scenario(groups):
        measured = [manifest_sizes, file_sizes['index.json'],
                    *(file_sizes[f'details/{group}.json'] for group in groups)]
        return {'requests': 2 + len(groups), 'groups': list(groups),
                'fetchedCards': sum(bundle.manifest['details'][group]['count'] for group in groups),
                **{key: sum(item[key] for item in measured) for key in ('bytes', 'gzipBytes')}}

    fields = []
    for field in sorted({key for card in index for key in card}):
        # Values only: exclude each json_bytes newline and the wire structure.
        values = [json_bytes(card[field])[:-1] for card in index if field in card]
        fields.append({'field': field, 'presentCards': len(values),
                       'uniqueValues': len(set(values)), 'valueBytes': sum(map(len, values))})
    all_groups = sorted(bundle.manifest['details'])
    return {
        'reportVersion': 1,
        'catalogVersion': bundle.manifest['catalogVersion'],
        'counts': dict(bundle.manifest['counts']),
        'scenarios': {
            'initial': scenario([]),
            'selected': {**scenario(selected_groups), 'requestedEntries': len(requested),
                         'uniqueRequestedCards': unique_requested,
                         'relatedCards': len(selected) - unique_requested},
            'all': scenario(all_groups),
        },
        'detailGroups': [{'group': group, 'cards': bundle.manifest['details'][group]['count'],
                          **file_sizes[f'details/{group}.json']} for group in all_groups],
        'indexFields': fields,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--released', type=Path, default=DEFAULT_RELEASED)
    parser.add_argument('--preview', type=Path, default=DEFAULT_PREVIEW)
    parser.add_argument('--deck', type=Path, help='Exported deck JSON; includes related cards')
    parser.add_argument('--check-output', type=Path, help='Also verify existing build artifacts match the inputs')
    args = parser.parse_args(argv)
    try:
        if args.check_output:
            bundle = check_catalog(args.released, args.preview, args.check_output)
        else:
            bundle, _ = read_inputs(args.released, args.preview)
        ids = []
        if args.deck:
            value = json.loads(args.deck.read_bytes(), object_pairs_hook=unique_object,
                               parse_constant=reject_constant)
            ids = exported_deck_ids(value)
        report = measure_catalog(bundle, ids)
    except (ValueError, OSError, UnicodeError) as error:
        print(f'Card catalog measurement failed: {error}', file=sys.stderr)
        return 1
    print(json.dumps(report, ensure_ascii=False, sort_keys=True, indent=2))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
