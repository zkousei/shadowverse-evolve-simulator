import gzip
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from tools.card_data.generate_catalog import build_catalog, json_bytes
from tools.card_data.catalog_history import retain_catalog, stage_catalog


class CatalogHistoryTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.released = self.root / 'released.json'
        self.preview = self.root / 'preview.json'
        self.history = self.root / 'history'
        self.output = self.root / 'stage'
        self.cards = [{'id': 'BP01-001', 'name': 'Old', 'future': {'value': 0}, 'ability_text': 'Old details'}]
        self.released.write_bytes(json_bytes(self.cards))
        self.preview.write_text('[]')

    def retain(self):
        return retain_catalog(self.released, self.preview, self.history)

    def stage(self, output=None, check=False):
        return stage_catalog(self.released, self.preview, self.history, output or self.output, check=check)

    def test_retain_is_repeatable_preserves_inputs_and_existing_archive_bytes(self):
        inputs = [self.released.read_bytes(), self.preview.read_bytes()]
        version = self.retain()
        archive = self.history / f'{version}.json.gz'
        before = archive.read_bytes()
        self.assertEqual(self.retain(), version)
        self.assertEqual(archive.read_bytes(), before)
        self.assertEqual([self.released.read_bytes(), self.preview.read_bytes()], inputs)
        self.assertEqual(set(self.history.iterdir()), {archive, self.history / 'versions.json'})

    def test_requires_current_version_in_history_before_staging(self):
        with self.assertRaisesRegex(ValueError, 'not retained'):
            self.stage()
        self.assertFalse(self.output.exists())
        self.retain()
        self.cards[0]['name'] = 'New'
        self.released.write_bytes(json_bytes(self.cards))
        with self.assertRaisesRegex(ValueError, 'not retained'):
            self.stage()
        self.assertFalse(self.output.exists())

    def test_update_publishes_old_unfetched_details_and_current_manifest(self):
        old_version = self.retain()
        old = build_catalog(self.cards, [])
        self.cards = [{'id': 'BP02-001', 'name': 'New', 'ability_text': 'New details'}]
        self.released.write_bytes(json_bytes(self.cards))
        new_version = self.retain()
        result = self.stage()
        self.assertEqual(result['catalogVersion'], new_version)
        self.assertEqual(result['retainedVersions'], sorted([old_version, new_version]))
        self.assertEqual(json.loads((self.output / 'manifest.json').read_bytes())['catalogVersion'], new_version)
        for name, data in old.files.items():
            self.assertEqual((self.output / 'versions' / old_version / name).read_bytes(), data)
        self.assertEqual(self.stage(check=True), result)

    def test_corrupt_old_archive_fails_without_publishing_or_repairing_it(self):
        old_version = self.retain()
        archive = self.history / f'{old_version}.json.gz'
        archive.write_bytes(b'corrupt')
        self.cards[0]['name'] = 'New'
        self.released.write_bytes(json_bytes(self.cards))
        self.retain()
        with self.assertRaises(ValueError):
            self.stage()
        self.assertFalse(self.output.exists())
        self.assertEqual(archive.read_bytes(), b'corrupt')

    def test_wrong_version_payload_and_unsupported_schema_are_rejected(self):
        version = self.retain()
        archive = self.history / f'{version}.json.gz'
        original = json.loads(gzip.decompress(archive.read_bytes()))
        for mutate in [lambda data: data.update(schemaVersion=2),
                       lambda data: data['released'][0].update(name='Tampered')]:
            value = json.loads(json.dumps(original))
            mutate(value)
            archive.write_bytes(gzip.compress(json_bytes(value), mtime=0))
            with self.assertRaises(ValueError):
                self.stage()
            with self.assertRaises(ValueError):
                self.retain()
        self.assertFalse(self.output.exists())

    def test_check_detects_missing_corrupt_and_unexpected_files_without_writing(self):
        self.retain()
        result = self.stage()
        for name in result['files']:
            target = self.output / name
            original = target.read_bytes()
            target.write_bytes(b'corrupt')
            with self.assertRaises(ValueError):
                self.stage(check=True)
            self.assertEqual(target.read_bytes(), b'corrupt')
            target.unlink()
            with self.assertRaises(ValueError):
                self.stage(check=True)
            target.write_bytes(original)
        extra = self.output / 'extra.txt'
        extra.write_text('unexpected')
        with self.assertRaises(ValueError):
            self.stage(check=True)
        self.assertEqual(extra.read_text(), 'unexpected')

    def test_staging_refuses_existing_contents_and_input_ancestors(self):
        self.retain()
        with self.assertRaises(ValueError):
            self.stage(output=self.root)
        self.assertTrue(self.released.exists())
        self.stage()
        with self.assertRaisesRegex(ValueError, 'empty'):
            self.stage()

    def test_failed_atomic_archive_creation_preserves_history(self):
        version = self.retain()
        previous = {p.name: p.read_bytes() for p in self.history.iterdir()}
        self.cards[0]['name'] = 'New'
        self.released.write_bytes(json_bytes(self.cards))
        with patch('tools.card_data.catalog_history.os.link', side_effect=OSError('disk error')):
            with self.assertRaises(OSError):
                self.retain()
        self.assertEqual({p.name: p.read_bytes() for p in self.history.iterdir()}, previous)
        self.assertTrue((self.history / f'{version}.json.gz').exists())

    def test_input_change_during_retention_does_not_record_a_version(self):
        from tools.card_data import catalog_history
        original = catalog_history.read_inputs
        def changing(*args):
            bundle, snapshots = original(*args)
            self.released.write_bytes(json_bytes([]))
            return bundle, snapshots
        with patch.object(catalog_history, 'read_inputs', side_effect=changing):
            with self.assertRaisesRegex(ValueError, 'changed'):
                self.retain()
        self.assertFalse(list(self.history.glob('*.json.gz')))

    def test_missing_old_archive_is_detected_even_when_current_is_present(self):
        old_version = self.retain()
        self.cards[0]['name'] = 'New'
        self.released.write_bytes(json_bytes(self.cards))
        self.retain()
        (self.history / f'{old_version}.json.gz').unlink()
        with self.assertRaisesRegex(ValueError, 'missing'):
            self.stage()
        self.assertFalse(self.output.exists())

    def test_invalid_gzip_body_is_a_normal_validation_error(self):
        version = self.retain()
        archive = self.history / f'{version}.json.gz'
        archive.write_bytes(b'\x1f\x8b\x08\x00' + b'\0' * 6 + b'\x07' + b'\0' * 8)
        with self.assertRaises(ValueError):
            self.stage()

    def test_registry_write_failure_does_not_leave_a_new_archive(self):
        self.retain()
        previous = {p.name: p.read_bytes() for p in self.history.iterdir()}
        self.cards[0]['name'] = 'New'
        self.released.write_bytes(json_bytes(self.cards))
        with patch('tools.card_data.catalog_history.os.replace', side_effect=OSError('disk error')):
            with self.assertRaises(OSError):
                self.retain()
        self.assertEqual({p.name: p.read_bytes() for p in self.history.iterdir()}, previous)

    def test_missing_registry_and_busy_writer_fail_without_repair(self):
        self.retain()
        registry = self.history / 'versions.json'
        registry.unlink()
        with self.assertRaisesRegex(ValueError, 'registry is missing'):
            self.retain()
        with self.assertRaises(ValueError):
            self.stage()
        self.assertFalse(registry.exists())
        lock = self.history / '.history-lock'
        lock.mkdir()
        with self.assertRaisesRegex(ValueError, 'busy'):
            self.retain()
        self.assertTrue(lock.is_dir())

    def test_preserves_release_precedence_related_faces_and_unknown_fields(self):
        from tools.card_data.generate_catalog_test import fixtures
        released, preview = fixtures()
        self.released.write_bytes(json_bytes(released))
        self.preview.write_bytes(json_bytes(preview))
        version = self.retain()
        expected = build_catalog(released, preview)
        self.stage()
        for name, data in expected.files.items():
            self.assertEqual((self.output / 'versions' / version / name).read_bytes(), data)
