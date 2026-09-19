"""Run with python3 -m tools.svestats_preview.sync from the repository root."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import tempfile

from tools.card_data.audit_preview_cards import load_cards, validate_preview_cards
from .converter import convert_card, required_text, string_list
from .source import SOURCE_URL, fetch_cards

ROOT = Path(__file__).resolve().parents[2]
PRODUCTS = Path(__file__).with_name('products.json')


def build_catalog(source: list[dict], released: list[dict], products: dict) -> tuple:
    if not isinstance(source, list) or any(not isinstance(card, dict) for card in source):
        raise ValueError('Source must be an array of card objects')
    records = {}
    for record in source:
        card_id = required_text(record, 'oracle_id')
        if card_id in records:
            raise ValueError(f'Duplicate source ID: {card_id}')
        records[card_id] = record
    released_map = {card['id']: card for card in released}
    cards, excluded, warnings = [], [], set()
    aliases = {}
    for card_id, record in sorted(records.items()):
        if card_id in released_map:
            excluded.append({'id': card_id, 'reason': 'released'})
        elif record.get('reprint_of'):
            aliases[card_id] = required_text(record, 'reprint_of')
            excluded.append({'id': card_id, 'reason': 'reprint', 'target': aliases[card_id]})
        else:
            cards.append(convert_card(record, products))
            if record['expansion'] not in products:
                warnings.add(f'Unknown product: {record["expansion"]}')
    known = {**released_map, **{card['id']: card for card in cards}}
    for card in cards:
        record = records[card['id']]
        related = set()
        for field in ('evolves_to', 'evolved_from', 'mentions', 'mentions_tokens'):
            for target in string_list(record, field):
                visited = set()
                while target in aliases:
                    if target in visited:
                        raise ValueError(f'Cyclic reprint reference: {target}')
                    visited.add(target)
                    target = aliases[target]
                if target not in known:
                    raise ValueError(f'{card["id"]}: unresolved reference {target}')
                if target != card['id']:
                    related.add(target)
        if related:
            card['related_cards'] = [{'id': target, 'name': known[target]['name']} for target in sorted(related)]
    issues = {key: value for key, value in validate_preview_cards(cards, released).items() if value}
    if issues:
        raise ValueError('Preview audit failed: ' + json.dumps(issues, ensure_ascii=False))
    return cards, excluded, sorted(warnings)


def diff_cards(before: list[dict], after: list[dict]) -> dict:
    old = {card['id']: card for card in before}
    new = {card['id']: card for card in after}
    return {
        'added': sorted(new.keys() - old.keys()),
        'removed': sorted(old.keys() - new.keys()),
        'updated': {
            key: sorted(field for field in old[key].keys() | new[key].keys() if field not in old[key] or field not in new[key] or old[key][field] != new[key][field])
            for key in sorted(old.keys() & new.keys()) if old[key] != new[key]
        },
    }


def write_json(path: Path, data) -> None:
    content = json.dumps(data, ensure_ascii=False, indent=2) + '\n'
    if path.exists() and path.read_text(encoding='utf-8') == content:
        return
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=path.parent, delete=False) as handle:
            temporary = Path(handle.name)
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.chmod(path.stat().st_mode & 0o777 if path.exists() else 0o644)
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description='Synchronize preview cards from svestats (local edits are overwritten).')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--allow-empty', action='store_true')
    parser.add_argument('--report', type=Path)
    parser.add_argument('--released', type=Path, default=ROOT / 'public/cards_detailed.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'public/cards_preview.json')
    args = parser.parse_args(argv)
    try:
        paths = [args.released.resolve(), args.output.resolve()]
        if args.report:
            paths.append(args.report.resolve())
        if len(paths) != len(set(paths)) or PRODUCTS.resolve() in paths:
            raise ValueError('Input, output and report paths must be distinct and must not overwrite products.json')
        released = load_cards(args.released)
        previous = load_cards(args.output) if args.output.exists() else []
        products = json.loads(PRODUCTS.read_text(encoding='utf-8'))
        source = fetch_cards()
        if not source and not args.allow_empty:
            raise ValueError('Empty source: use --allow-empty to explicitly remove all preview cards')
        cards, excluded, warnings = build_catalog(source, released, products)
        report = {
            'source_url': SOURCE_URL,
            'fetched_at': datetime.now(timezone.utc).isoformat(),
            'dry_run': args.dry_run,
            'fetched_count': len(source),
            'output_count': len(cards),
            'diff': diff_cards(previous, cards),
            'excluded': excluded,
            'warnings': warnings,
            'sources': {record['oracle_id']: record.get('source_url') for record in source},
        }
        print(f'Fetched: {len(source)}; preview: {len(cards)}')
        changes = report['diff']
        print(f'Added: {len(changes["added"])}; updated: {len(changes["updated"])}; removed: {len(changes["removed"])}')
        print(json.dumps({key: report[key] for key in ('diff', 'excluded', 'warnings')}, ensure_ascii=False, indent=2))
        # Write the optional report first, so a bad report destination cannot change the catalog.
        if args.report:
            write_json(args.report, report)
        if not args.dry_run:
            write_json(args.output, cards)
        print('Dry run: catalog unchanged' if args.dry_run else f'Synchronized: {args.output}')
        return 0
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(f'Preview sync failed: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
