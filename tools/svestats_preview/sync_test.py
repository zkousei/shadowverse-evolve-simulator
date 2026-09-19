import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tools.svestats_preview.converter_test import fixture
from tools.svestats_preview.sync import build_catalog, diff_cards, main


class SyncTest(unittest.TestCase):
    def test_catalog_relations_treasure_and_determinism(self):
        cards, excluded, warnings = build_catalog(fixture(), [], {})
        self.assertEqual(len(cards), 3)
        self.assertEqual(cards[0]['related_cards'], [{'id': 'TEST-002', 'name': 'テスト'}])
        self.assertEqual(build_catalog(list(reversed(fixture())), [], {})[0], cards)
        self.assertEqual(excluded, [])
        self.assertTrue(warnings)

    def test_released_reprint_and_alias_reference(self):
        source = fixture()
        source[1]['reprint_of'] = 'OLD-001'
        released = [{'id': 'OLD-001', 'name': '正式'}]
        cards, excluded, _ = build_catalog(source, released, {})
        self.assertEqual(cards[0]['related_cards'], [{'id': 'OLD-001', 'name': '正式'}])
        self.assertEqual(len(excluded), 1)
        cards, excluded, _ = build_catalog(fixture(), [{'id': c['oracle_id'], 'name': c['name']} for c in fixture()], {})
        self.assertEqual(cards, [])
        self.assertEqual(len(excluded), 3)

    def test_invalid_catalog(self):
        for source in [fixture() + [fixture()[0]], fixture()[:1]]:
            with self.assertRaises(ValueError):
                build_catalog(source, [], {})

    def test_diff(self):
        self.assertEqual(diff_cards([{'id': 'A', 'name': 'old'}, {'id': 'B'}], [{'id': 'A', 'name': 'new'}, {'id': 'C'}]), {
            'added': ['C'], 'removed': ['B'], 'updated': {'A': ['name']}})

    def test_diff_reports_removed_null_field(self):
        self.assertEqual(diff_cards([{'id': 'A', 'title': None}], [{'id': 'A'}])['updated'], {'A': ['title']})

    @patch('tools.svestats_preview.sync.fetch_cards')
    def test_cli_preserves_files_dry_run_failure_and_empty(self, fetch):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            released = root / 'released.json'
            output = root / 'preview.json'
            report = root / 'report.json'
            released.write_text('[]')
            output.write_text('[{"id":"OLD","name":"old"}]')
            original = output.read_bytes()
            args = ['--released', str(released), '--output', str(output), '--report', str(report)]
            fetch.return_value = fixture()
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(main(args + ['--dry-run']), 0)
                self.assertEqual(output.read_bytes(), original)
                self.assertEqual(len(json.loads(report.read_text())['sources']), 3)
                fetch.return_value = []
                self.assertEqual(main(args), 1)
                self.assertEqual(output.read_bytes(), original)
                fetch.return_value = fixture()[:1]
                self.assertEqual(main(args), 1)
                self.assertEqual(output.read_bytes(), original)
                fetch.side_effect = TimeoutError('offline')
                self.assertEqual(main(args), 1)
                self.assertEqual(output.read_bytes(), original)
                fetch.side_effect = None
                fetch.return_value = fixture()
                self.assertEqual(main(args), 0)
                stamp = output.stat().st_mtime_ns
                self.assertEqual(main(args), 0)
                self.assertEqual(output.stat().st_mtime_ns, stamp)
                fetch.return_value = []
                self.assertEqual(main(args + ['--allow-empty']), 0)
                self.assertEqual(json.loads(output.read_text()), [])

    @patch('tools.svestats_preview.sync.fetch_cards', return_value=fixture())
    def test_all_released_can_empty_without_flag(self, fetch):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            released = root / 'released.json'
            output = root / 'preview.json'
            cards, _, _ = build_catalog(fixture(), [], {})
            released.write_text(json.dumps(cards))
            output.write_text(json.dumps(cards))
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(main(['--released', str(released), '--output', str(output)]), 0)
            self.assertEqual(json.loads(output.read_text()), [])

    def test_atomic_write_failure_keeps_original(self):
        from tools.svestats_preview.sync import write_json
        with tempfile.TemporaryDirectory() as folder:
            output = Path(folder) / 'preview.json'
            output.write_text('[]')
            with patch('tools.svestats_preview.sync.os.replace', side_effect=OSError('write failed')):
                with self.assertRaises(OSError):
                    write_json(output, [{'id': 'NEW'}])
            self.assertEqual(output.read_text(), '[]')
            self.assertEqual(list(Path(folder).iterdir()), [output])

    @patch('tools.svestats_preview.sync.fetch_cards', return_value=fixture())
    def test_report_cannot_overwrite_catalog(self, fetch):
        with tempfile.TemporaryDirectory() as folder:
            target = Path(folder) / 'cards.json'
            target.write_text('[]')
            with contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(main(['--released', str(target), '--output', str(target), '--report', str(target)]), 1)
            self.assertEqual(target.read_text(), '[]')
