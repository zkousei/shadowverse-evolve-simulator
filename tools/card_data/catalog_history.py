"""Retain verified snapshots and stage all published versions for a static build.

History is an explicit source-controlled release input, never a build cache.
Staging targets must be empty private directories, not live publication roots.
"""
import argparse
import gzip
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import zlib

from tools.card_data.generate_catalog import (
    DEFAULT_PREVIEW, DEFAULT_RELEASED, SCHEMA_VERSION, build_catalog, json_bytes,
    read_inputs, reassemble_catalog, reject_constant, unique_object,
)

DEFAULT_HISTORY = Path('card-catalog-history')
ARCHIVE_NAME = re.compile(r'([a-f0-9]{64})\.json\.gz')


def read_archive(path):
    match = ARCHIVE_NAME.fullmatch(path.name)
    if not match or path.is_symlink() or not path.is_file():
        raise ValueError(f'Invalid retained catalog path: {path.name}')
    try:
        raw = json.loads(gzip.decompress(path.read_bytes()), object_pairs_hook=unique_object,
                         parse_constant=reject_constant)
        if (not isinstance(raw, dict) or set(raw) != {'schemaVersion', 'catalogVersion', 'released', 'preview'}
                or type(raw['schemaVersion']) is not int or raw['schemaVersion'] != SCHEMA_VERSION
                or raw['catalogVersion'] != match[1]):
            raise ValueError('Unsupported or inconsistent retained catalog metadata')
        bundle = build_catalog(raw['released'], raw['preview'])
        if bundle.manifest['catalogVersion'] != match[1]:
            raise ValueError('Retained catalog version does not match content')
        return bundle
    except (ValueError, UnicodeError, OSError, EOFError, zlib.error) as error:
        raise ValueError(f'Invalid retained catalog {path.name}: {error}') from error


def ensure_inputs_unchanged(snapshots):
    if any(path.read_bytes() != data for path, data in snapshots.items()):
        raise ValueError('Input catalogs changed during retention/staging; retry with stable inputs')


def history_versions(root):
    registry = root / 'versions.json'
    if not registry.exists():
        if root.exists() and any(root.glob('*.json.gz')):
            raise ValueError('Retained catalog registry is missing')
        return []
    if registry.is_symlink() or not registry.is_file():
        raise ValueError('Invalid retained catalog registry path')
    try:
        value = json.loads(registry.read_bytes(), object_pairs_hook=unique_object,
                           parse_constant=reject_constant)
        versions = value.get('versions') if isinstance(value, dict) else None
        if (not isinstance(value, dict) or set(value) != {'schemaVersion', 'versions'}
                or type(value['schemaVersion']) is not int or value['schemaVersion'] != SCHEMA_VERSION
                or not isinstance(versions, list)
                or any(not isinstance(version, str) or not re.fullmatch(r'[a-f0-9]{64}', version)
                       for version in versions)
                or versions != sorted(set(versions))):
            raise ValueError('Unsupported or invalid retained catalog registry')
        return versions
    except (ValueError, UnicodeError) as error:
        raise ValueError(f'Invalid retained catalog registry: {error}') from error


def record_bundle(root, bundle, snapshots, payload):
    version = bundle.manifest['catalogVersion']
    versions = history_versions(root)
    target = root / f'{version}.json.gz'
    temporary = None
    pointer = None
    created = False
    try:
        if target.exists() or target.is_symlink():
            if read_archive(target).files != bundle.files:
                raise ValueError('Existing retained catalog differs; archives are immutable')
        else:
            with tempfile.NamedTemporaryFile(prefix='.retain-', dir=root, delete=False) as handle:
                temporary = Path(handle.name)
                handle.write(gzip.compress(payload, mtime=0))
                handle.flush()
                os.fsync(handle.fileno())
            ensure_inputs_unchanged(snapshots)
            # Atomic create-only publication under the history writer lock.
            os.link(temporary, target)
            created = True
        ensure_inputs_unchanged(snapshots)
        if version not in versions:
            registry = json_bytes({'schemaVersion': SCHEMA_VERSION, 'versions': sorted([*versions, version])})
            with tempfile.NamedTemporaryFile(prefix='.history-index-', dir=root, delete=False) as handle:
                pointer = Path(handle.name)
                handle.write(registry)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(pointer, root / 'versions.json')
            pointer = None
    except BaseException:
        if created:
            target.unlink(missing_ok=True)
        raise
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)
        if pointer is not None:
            pointer.unlink(missing_ok=True)
    return version


def retain_catalog(released_path, preview_path, history):
    if history.is_symlink():
        raise ValueError('History directory must not be a symlink')
    root = history.resolve()
    if any(root == path.resolve() or root in path.resolve().parents
           for path in (released_path, preview_path)):
        raise ValueError('History directory must not contain input catalogs')
    bundle, snapshots = read_inputs(released_path, preview_path)
    version = bundle.manifest['catalogVersion']
    index = json.loads(bundle.files['index.json'])
    details = {Path(name).stem: json.loads(data) for name, data in bundle.files.items()
               if name.startswith('details/')}
    cards = reassemble_catalog(index, details)
    payload = json_bytes({
        'schemaVersion': SCHEMA_VERSION, 'catalogVersion': version,
        'released': [card for card in cards if card['catalog_status'] == 'released'],
        'preview': [card for card in cards if card['catalog_status'] == 'preview'],
    })
    ensure_inputs_unchanged(snapshots)
    root.mkdir(parents=True, exist_ok=True)
    lock = root / '.history-lock'
    try:
        lock.mkdir()
    except FileExistsError as error:
        raise ValueError('Catalog history is busy; inspect the existing writer lock before retrying') from error
    try:
        return record_bundle(root, bundle, snapshots, payload)
    finally:
        lock.rmdir()


def stage_catalog(released_path, preview_path, history, output, check=False):
    root = output.resolve()
    protected = [released_path.resolve(), preview_path.resolve(), history.resolve()]
    if (any(root == path or root in path.parents for path in protected)
            or history.resolve() in root.parents):
        raise ValueError('Staging must not contain input catalogs or retained history')
    current, snapshots = read_inputs(released_path, preview_path)
    version = current.manifest['catalogVersion']
    bundles = {}
    if history.exists():
        if not history.is_dir() or history.is_symlink():
            raise ValueError('Invalid catalog history directory')
        versions = history_versions(history)
        expected = {f'{key}.json.gz' for key in versions} | {'versions.json'}
        actual = {path.name for path in history.iterdir() if path.name != 'README.md'}
        if actual != expected:
            raise ValueError('Retained catalog history has missing or unexpected files')
        for key in versions:
            bundle = read_archive(history / f'{key}.json.gz')
            bundles[key] = bundle
    if version not in bundles:
        raise ValueError('Current catalog is not retained; run npm run cards:retain:catalog and commit its archive')
    if bundles[version].files != current.files:
        raise ValueError('Current catalog and retained version differ')
    # The root manifest always describes current inputs, never an old snapshot.
    files = {'manifest.json': current.manifest_bytes}
    files.update({f'versions/{key}/{name}': data for key, bundle in bundles.items()
                  for name, data in bundle.files.items()})
    ensure_inputs_unchanged(snapshots)
    if check:
        actual = {path.relative_to(root).as_posix() for path in root.rglob('*') if path.is_file()}
        if actual != set(files):
            raise ValueError('Staged catalog has missing or unexpected files')
        for name, data in files.items():
            path = root / name
            if path.is_symlink() or path.read_bytes() != data:
                raise ValueError(f'Staged catalog is stale or corrupt: {name}')
    else:
        if root.exists() and (not root.is_dir() or any(root.iterdir())):
            raise ValueError('Catalog staging directory must be empty')
        root.mkdir(parents=True, exist_ok=True)
        for name, data in files.items():
            destination = root / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
        ensure_inputs_unchanged(snapshots)
    ensure_inputs_unchanged(snapshots)
    return {'catalogVersion': version, 'retainedVersions': sorted(bundles), 'files': sorted(files)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['retain', 'stage'])
    parser.add_argument('--released', type=Path, default=DEFAULT_RELEASED)
    parser.add_argument('--preview', type=Path, default=DEFAULT_PREVIEW)
    parser.add_argument('--history', type=Path, default=DEFAULT_HISTORY)
    parser.add_argument('--output', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args(argv)
    try:
        if args.operation == 'retain':
            if args.check or args.output is not None:
                raise ValueError('retain does not accept --check or --output')
            result = {'catalogVersion': retain_catalog(args.released, args.preview, args.history)}
        else:
            if args.output is None:
                raise ValueError('stage requires a private --output directory')
            result = stage_catalog(args.released, args.preview, args.history, args.output, args.check)
    except (ValueError, OSError) as error:
        print(f'Card catalog history failed: {error}', file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
