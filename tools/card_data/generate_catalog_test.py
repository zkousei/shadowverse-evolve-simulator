import copy
import hashlib
import json
from pathlib import Path, PureWindowsPath
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from tools.card_data.generate_catalog import (
    build_catalog, check_catalog, decode_index, encode_index, generate_catalog, reassemble_catalog, verify_version,
)


def fixtures():
    released = [
        {
            'id': 'BP02-002', 'name': '日本語のカード', 'image': '/card.png',
            'cost': '0', 'atk': 0, 'hp': '-', 'is_token': False,
            'ability_text': '能力\n二行目',
            'related_cards': [{'id': 'PV01-001', 'name': 'Preview'}],
            'faces': [{'side': 'front', 'name': '表面', 'future': {'value': None}}],
            'future_extension': {'zero': 0, 'flag': False, 'empty': ''},
        },
        {'id': 'BP01-001', 'name': 'Evolve', 'image': '',
         'related_cards': [{'id': 'BP02-002', 'name': '日本語のカード'}]},
    ]
    preview = [
        {'id': 'BP02-002', 'name': 'Overridden', 'image': '',
         'related_cards': [{'id': 'IGNORED-001', 'name': 'Discarded reference'}]},
        {'id': 'PV01-001', 'name': 'Preview', 'image': ''},
    ]
    return released, preview


def unpack(bundle):
    index = decode_index(json.loads(bundle.files['index.json']))
    details = {Path(name).stem: json.loads(data)
               for name, data in bundle.files.items() if name.startswith('details/')}
    return index, details


class GenerateCatalogTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.inputs = self.root / 'inputs'
        self.inputs.mkdir()
        self.released_path = self.inputs / 'released.json'
        self.preview_path = self.inputs / 'preview.json'
        self.output = self.root / 'artifacts'
        self.released, self.preview = fixtures()
        self.write_inputs()

    def write_inputs(self):
        self.released_path.write_text(json.dumps(self.released, ensure_ascii=False), encoding='utf-8')
        self.preview_path.write_text(json.dumps(self.preview, ensure_ascii=False), encoding='utf-8')

    def snapshot(self, root):
        return {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file()}

    def test_round_trip_keeps_order_release_precedence_and_every_source_field(self):
        original = copy.deepcopy((self.released, self.preview))
        bundle = build_catalog(self.released, self.preview)
        index, details = unpack(bundle)
        expected = [{**card, 'catalog_status': 'released'} for card in self.released]
        expected.append({**self.preview[1], 'catalog_status': 'preview'})
        restored = reassemble_catalog(index, details)
        self.assertEqual(json.dumps(restored, sort_keys=True), json.dumps(expected, sort_keys=True))
        self.assertEqual((self.released, self.preview), original)
        self.assertEqual([c['id'] for c in index], ['BP02-002', 'BP01-001', 'PV01-001'])
        self.assertEqual(index[0]['related_cards'], expected[0]['related_cards'])
        self.assertNotIn('ability_text', index[0])
        self.assertNotIn('faces', index[0])
        self.assertNotIn('future_extension', index[0])
        self.assertNotIn('cost', index[1])
        self.assertEqual(index[0]['detail_group'], 'BP02')
        self.assertEqual(set(details), {'BP01', 'BP02', 'PV01'})

    def test_build_uses_versioned_compact_rows_without_losing_missing_or_false_values(self):
        bundle = build_catalog(self.released, self.preview)
        self.assertEqual(bundle.manifest['schemaVersion'], 2)
        wire = json.loads(bundle.files['index.json'])
        self.assertEqual(wire['encoding'], 'rows-v1')
        self.assertEqual(len(wire['rows']), 3)
        first = wire['rows'][0]
        restored = dict(zip([key for bit, key in enumerate(wire['fields'])
                             if first[0] & (1 << bit)], first[1:]))
        self.assertEqual(restored['atk'], 0)
        self.assertIs(restored['is_token'], False)
        self.assertEqual(restored['related_cards'], self.released[0]['related_cards'])
        self.assertNotIn('faces', restored)
        self.assertEqual(restored['detail_group'], 'BP02')

    def test_compact_codec_preserves_values_order_and_absence_without_mutating(self):
        entries = [{'id': 'A-1', 'name': '日本語', 'detail_group': 'A', 'image': '',
                    'is_token': False, 'cost': '0', 'related_cards': [], 'atk': 0},
                   {'id': 'B-2', 'name': 'Minimal', 'detail_group': 'B'}]
        before = copy.deepcopy(entries)
        wire = encode_index(entries)
        self.assertEqual(decode_index(wire), entries)
        self.assertEqual(entries, before)
        self.assertEqual(decode_index(encode_index([])), [])
        decoded = decode_index(wire)
        decoded[0]['related_cards'].append({'id': 'A-1', 'name': 'self'})
        self.assertEqual(decode_index(wire), entries)
        with self.assertRaises(ValueError):
            encode_index([{**entries[0], 'ability_text': 'not an index field'}])

    def test_compact_codec_rejects_shifted_missing_and_unknown_data(self):
        wire = encode_index([{'id': 'A-1', 'name': 'A', 'detail_group': 'A'}])
        required = wire['rows'][0][0]
        invalid = [None, [], {**wire, 'encoding': 'future'}, {**wire, 'extra': 1},
                   {**wire, 'fields': list(reversed(wire['fields']))},
                   {**wire, 'fields': ['id'] * len(wire['fields'])},
                   {**wire, 'rows': {}}, {**wire, 'rows': [None]},
                   {**wire, 'rows': [[]]},
                   *[{**wire, 'rows': [[mask, 'A-1', 'A', 'A']]}
                     for mask in [True, -1, required + 0.5, required + (1 << 20)]],
                   *[{**wire, 'rows': [[required - missing, 'A-1', 'A']]}
                     for missing in [1, 2, 1 << 19]],
                   {**wire, 'rows': [[required, 'A-1', 'A']]},
                   {**wire, 'rows': [[required, 'A-1', 'A', 'A', 'extra']]}]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(ValueError):
                decode_index(value)

    def test_generating_after_a_schema_one_manifest_keeps_old_files_and_installs_schema_two(self):
        from tools.card_data.generate_catalog import json_bytes, sha256, sizes
        current = build_catalog(self.released, self.preview)
        index, _details = unpack(current)
        old_files = {**current.files, 'index.json': json_bytes(index)}
        old_version = sha256(json_bytes({'schemaVersion': 1,
                                        'files': {name: sha256(data) for name, data in old_files.items()}}))
        manifest = copy.deepcopy(current.manifest)
        manifest.update(schemaVersion=1, catalogVersion=old_version)
        for entry in [manifest['index'], *manifest['details'].values()]:
            name = entry['file'].split('/', 2)[2]
            entry.update(file=f'versions/{old_version}/{name}', sha256=sha256(old_files[name]), **sizes(old_files[name]))
        for name, data in old_files.items():
            target = self.output / 'versions' / old_version / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
        (self.output / 'manifest.json').write_bytes(json_bytes(manifest))
        updated = generate_catalog(self.released_path, self.preview_path, self.output)
        self.assertEqual(updated.manifest['schemaVersion'], 2)
        self.assertNotEqual(updated.manifest['catalogVersion'], old_version)
        self.assertEqual(json.loads((self.output / 'manifest.json').read_bytes()), updated.manifest)
        for name, data in old_files.items():
            self.assertEqual((self.output / 'versions' / old_version / name).read_bytes(), data)
        check_catalog(self.released_path, self.preview_path, self.output)

    def test_output_is_deterministic_and_version_changes_with_data_or_order(self):
        first = build_catalog(self.released, self.preview)
        second = build_catalog(self.released, self.preview)
        self.assertEqual(first.files, second.files)
        self.assertEqual(first.manifest, second.manifest)
        reordered = list(reversed(self.released))
        self.assertNotEqual(first.manifest['catalogVersion'], build_catalog(reordered, self.preview).manifest['catalogVersion'])
        self.released[0]['future_extension']['zero'] = 1
        self.assertNotEqual(first.manifest['catalogVersion'], build_catalog(self.released, self.preview).manifest['catalogVersion'])

    def test_rejects_invalid_records_duplicates_paths_and_dangling_references(self):
        invalid = [
            None, {}, [None], [{'id': '', 'name': 'Empty'}],
            [{'id': 'BAD-001', 'name': ''}],
            [{'id': '../-001', 'name': 'Unsafe group'}],
            [{'id': 'BP01-001', 'name': 'A'}, {'id': 'BP01-001', 'name': 'B'}],
            [{'id': 'BP01-001', 'name': 'A', 'related_cards': [{'id': 'MISSING-001'}]}],
            [{'id': 'BP01-001', 'name': 'A', 'related_cards': 'invalid'}],
            [{'id': 'BP01-001', 'name': 'A', 'faces': [None]}],
            [{'id': 'BP01-001', 'name': 'A', 'image': None}],
        ]
        for released in invalid:
            with self.subTest(released=released), self.assertRaises(ValueError):
                build_catalog(released, [])
        with self.assertRaises(ValueError):
            build_catalog([], [self.preview[1], self.preview[1]])

    def test_empty_catalogs_have_a_valid_empty_index(self):
        bundle = build_catalog([], [])
        index, details = unpack(bundle)
        self.assertEqual(reassemble_catalog(index, details), [])
        self.assertEqual(bundle.manifest['counts'], {'released': 0, 'preview': 0, 'total': 0})

    def test_reassembly_rejects_missing_extra_duplicate_or_modified_records(self):
        index, details = unpack(build_catalog(self.released, self.preview))
        for mutate in [
            lambda groups: groups.pop('BP02'),
            lambda groups: groups['BP02'].append(groups['BP02'][0]),
            lambda groups: groups['BP02'].append({'id': 'BP02-003', 'name': 'Extra'}),
            lambda groups: groups['BP02'][0].update(name='Unexpected'),
        ]:
            altered = copy.deepcopy(details)
            mutate(altered)
            with self.assertRaises(ValueError):
                reassemble_catalog(index, altered)

    def test_generate_and_check_preserve_inputs_and_publish_verified_files(self):
        before = self.snapshot(self.inputs)
        bundle = generate_catalog(self.released_path, self.preview_path, self.output)
        manifest = json.loads((self.output / 'manifest.json').read_text())
        self.assertEqual(manifest, bundle.manifest)
        for descriptor in [manifest['index'], *manifest['details'].values()]:
            data = (self.output / descriptor['file']).read_bytes()
            self.assertEqual(len(data), descriptor['bytes'])
            self.assertEqual(hashlib.sha256(data).hexdigest(), descriptor['sha256'])
        generated = self.snapshot(self.output)
        check_catalog(self.released_path, self.preview_path, self.output)
        generate_catalog(self.released_path, self.preview_path, self.output)
        self.assertEqual(self.snapshot(self.inputs), before)
        self.assertEqual(self.snapshot(self.output), generated)

    def test_version_verification_uses_portable_manifest_paths(self):
        bundle = build_catalog(self.released, self.preview)
        folder = MagicMock()
        entries = []
        for name in bundle.files:
            entry = MagicMock()
            entry.is_file.return_value = True
            entry.relative_to.return_value = PureWindowsPath(name)
            entries.append(entry)
        folder.rglob.return_value = entries

        def child(name):
            path = MagicMock()
            path.read_bytes.return_value = bundle.files[name]
            return path

        folder.__truediv__.side_effect = child
        verify_version(folder, bundle)

    def test_check_detects_corruption_and_stale_inputs_without_writing(self):
        bundle = generate_catalog(self.released_path, self.preview_path, self.output)
        self.released[0]['name'] = 'Updated'
        self.write_inputs()
        before = self.snapshot(self.output)
        with self.assertRaises(ValueError):
            check_catalog(self.released_path, self.preview_path, self.output)
        self.assertEqual(self.snapshot(self.output), before)
        self.released, self.preview = fixtures()
        self.write_inputs()
        (self.output / bundle.manifest['index']['file']).write_text('[]')
        before = self.snapshot(self.output)
        with self.assertRaises(ValueError):
            check_catalog(self.released_path, self.preview_path, self.output)
        with self.assertRaises(ValueError):
            generate_catalog(self.released_path, self.preview_path, self.output)
        self.assertEqual(self.snapshot(self.output), before)

    def test_check_on_a_fresh_checkout_does_not_create_artifacts(self):
        with self.assertRaisesRegex(ValueError, 'missing'):
            check_catalog(self.released_path, self.preview_path, self.output)
        self.assertFalse(self.output.exists())

    def test_refuses_to_overwrite_an_unrelated_output_manifest(self):
        self.output.mkdir()
        (self.output / 'manifest.json').write_text('{"other_application":true}')
        before = self.snapshot(self.output)
        with self.assertRaisesRegex(ValueError, 'manifest'):
            generate_catalog(self.released_path, self.preview_path, self.output)
        self.assertEqual(self.snapshot(self.output), before)

    def test_failed_manifest_publication_keeps_the_previous_version_readable(self):
        generate_catalog(self.released_path, self.preview_path, self.output)
        before = self.snapshot(self.output)
        self.released[0]['name'] = 'Updated'
        self.write_inputs()
        with patch('tools.card_data.generate_catalog.os.replace', side_effect=OSError('Disk full')):
            with self.assertRaises(OSError):
                generate_catalog(self.released_path, self.preview_path, self.output)
        for name, data in before.items():
            self.assertEqual((self.output / name).read_bytes(), data)
        self.assertFalse(list(self.output.glob('.catalog-*')))

    def test_input_changes_during_generation_do_not_publish_a_mixed_snapshot(self):
        import os
        generate_catalog(self.released_path, self.preview_path, self.output)
        manifest = (self.output / 'manifest.json').read_bytes()
        self.released[0]['name'] = 'First update'
        self.write_inputs()
        rename = os.rename

        def change_input(source, destination):
            self.released[0]['name'] = 'Concurrent update'
            self.write_inputs()
            return rename(source, destination)

        with patch('tools.card_data.generate_catalog.os.rename', side_effect=change_input):
            with self.assertRaisesRegex(ValueError, 'changed during generation'):
                generate_catalog(self.released_path, self.preview_path, self.output)
        self.assertEqual((self.output / 'manifest.json').read_bytes(), manifest)
        self.assertFalse(list(self.output.glob('.catalog-*')))

    def test_rejects_bad_json_and_unsafe_output_without_changing_inputs(self):
        for content in ['not JSON', '{"id":1}', '[{"id":"A","id":"B","name":"Duplicate key"}]', '[NaN]']:
            self.released_path.write_text(content)
            with self.subTest(content=content), self.assertRaises(ValueError):
                generate_catalog(self.released_path, self.preview_path, self.output)
            self.assertFalse(self.output.exists())
        self.write_inputs()
        before = self.snapshot(self.inputs)
        with self.assertRaises(ValueError):
            generate_catalog(self.released_path, self.preview_path, self.inputs)
        self.assertEqual(self.snapshot(self.inputs), before)


if __name__ == '__main__':
    unittest.main()
