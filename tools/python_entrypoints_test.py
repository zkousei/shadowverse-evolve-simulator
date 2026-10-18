"""Offline entry-point contracts: execute modules against temporary public data."""
import contextlib
import io
import json
import os
from pathlib import Path
import runpy
import sys
import tempfile
import unittest
from unittest.mock import AsyncMock, MagicMock, patch


class PythonEntrypointsTest(unittest.TestCase):
    def test_generated_catalog_module_and_read_only_check(self):
        card = {'id': 'TEST-001', 'name': 'Test', 'image': '', 'ability_text': 'Details'}
        with self.workspace():
            Path('public/cards_detailed.json').write_text(json.dumps([card]))
            Path('public/cards_preview.json').write_text('[]')
            inputs = {p: p.read_bytes() for p in Path('public').iterdir()}
            with patch.object(sys, 'argv', ['generate_catalog']), self.assertRaises(SystemExit) as result:
                self.run_module('tools.card_data.generate_catalog')
            self.assertEqual(result.exception.code, 0)
            output = Path('artifacts/card-catalog')
            self.assertTrue((output / 'manifest.json').is_file())
            generated = {p: p.read_bytes() for p in output.rglob('*') if p.is_file()}
            with patch.object(sys, 'argv', ['generate_catalog', '--check']), self.assertRaises(SystemExit) as result:
                self.run_module('tools.card_data.generate_catalog')
            self.assertEqual(result.exception.code, 0)
            self.assertEqual({p: p.read_bytes() for p in output.rglob('*') if p.is_file()}, generated)
            self.assertEqual({p: p.read_bytes() for p in Path('public').iterdir()}, inputs)
            Path('public/cards_preview.json').write_text('not JSON')
            with patch.object(sys, 'argv', ['generate_catalog']), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as result:
                self.run_module('tools.card_data.generate_catalog')
            self.assertEqual(result.exception.code, 1)
            self.assertEqual({p: p.read_bytes() for p in output.rglob('*') if p.is_file()}, generated)

    def test_catalog_measurement_module_is_read_only_and_measures_selected_groups(self):
        card = {'id': 'TEST-001', 'name': 'Test', 'image': '', 'ability_text': 'Details'}
        with self.workspace():
            Path('public/cards_detailed.json').write_text(json.dumps([card]))
            Path('public/cards_preview.json').write_text('[]')
            Path('deck.json').write_text(json.dumps({'mainDeck': [card, card]}))
            before = {str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}
            output = io.StringIO()
            with contextlib.redirect_stdout(output), patch.object(sys, 'argv', ['measure_catalog', '--deck', 'deck.json']), self.assertRaises(SystemExit) as result:
                self.run_module('tools.card_data.measure_catalog')
            self.assertEqual(result.exception.code, 0)
            report = json.loads(output.getvalue())
            self.assertEqual(report['scenarios']['initial']['requests'], 2)
            self.assertEqual(report['scenarios']['selected']['requests'], 3)
            self.assertEqual(report['scenarios']['selected']['requestedEntries'], 2)
            self.assertEqual(report['scenarios']['selected']['uniqueRequestedCards'], 1)
            self.assertEqual(report['scenarios']['selected']['groups'], ['TEST'])
            self.assertEqual({str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}, before)
            self.assertFalse(Path('artifacts').exists())
            from tools.card_data.generate_catalog import generate_catalog
            generate_catalog(Path('public/cards_detailed.json'), Path('public/cards_preview.json'), Path('build-catalog'))
            before = {str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}
            output = io.StringIO()
            with contextlib.redirect_stdout(output), patch.object(sys, 'argv', ['measure_catalog', '--deck', 'deck.json', '--check-output', 'build-catalog']), self.assertRaises(SystemExit) as result:
                self.run_module('tools.card_data.measure_catalog')
            self.assertEqual(result.exception.code, 0)
            self.assertEqual(json.loads(output.getvalue()), report)
            self.assertEqual({str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}, before)

    def test_catalog_measurement_rejects_bad_decks_and_corrupt_builds_without_writing(self):
        from tools.card_data.generate_catalog import generate_catalog

        with self.workspace():
            Path('public/cards_detailed.json').write_text(json.dumps([{'id': 'TEST-001', 'name': 'Test'}]))
            Path('public/cards_preview.json').write_text('[]')
            generate_catalog(Path('public/cards_detailed.json'), Path('public/cards_preview.json'), Path('build-catalog'))
            for deck in ('{', '{}', '{"mainDeck":{},"mainDeck":[]}', '{"mainDeck":[{"id":"UNKNOWN"}]}'):
                Path('deck.json').write_text(deck)
                before = {str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}
                output = io.StringIO()
                with self.subTest(deck=deck), contextlib.redirect_stdout(output), contextlib.redirect_stderr(io.StringIO()), patch.object(sys, 'argv', ['measure_catalog', '--deck', 'deck.json', '--check-output', 'build-catalog']), self.assertRaises(SystemExit) as result:
                    self.run_module('tools.card_data.measure_catalog')
                self.assertEqual(result.exception.code, 1)
                self.assertEqual(output.getvalue(), '')
                self.assertEqual({str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}, before)
            Path('build-catalog/manifest.json').write_text('{}')
            before = {str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}
            output = io.StringIO()
            with contextlib.redirect_stdout(output), contextlib.redirect_stderr(io.StringIO()), patch.object(sys, 'argv', ['measure_catalog', '--check-output', 'build-catalog']), self.assertRaises(SystemExit) as result:
                self.run_module('tools.card_data.measure_catalog')
            self.assertEqual(result.exception.code, 1)
            self.assertEqual(output.getvalue(), '')
            self.assertEqual({str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}, before)

    def test_partition_comparison_module_checks_real_artifacts_and_never_writes_models(self):
        from tools.card_data.generate_catalog import generate_catalog

        with self.workspace():
            cards = [{'id': f'A-{i:03}', 'name': f'Card {i}'} for i in range(3)]
            Path('public/cards_detailed.json').write_text(json.dumps(cards))
            Path('public/cards_preview.json').write_text('[]')
            Path('first.json').write_text(json.dumps({'mainDeck': [cards[0]]}))
            Path('second.json').write_text(json.dumps({'leaderCards': [cards[2]]}))
            bundle = generate_catalog(Path('public/cards_detailed.json'), Path('public/cards_preview.json'), Path('real-build'))
            before = {str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}
            output = io.StringIO()
            argv = ['compare_partitions', '--include-probes', '--check-output', 'real-build', '--deck', 'first.json', '--deck', 'second.json', '--max-cards', '2']
            with contextlib.redirect_stdout(output), patch.object(sys, 'argv', argv), self.assertRaises(SystemExit) as result:
                self.run_module('tools.card_data.compare_partitions')
            self.assertEqual(result.exception.code, 0)
            report = json.loads(output.getvalue())
            self.assertTrue(report['comparisonOnly'])
            self.assertEqual(report['sourceCatalogVersion'], bundle.manifest['catalogVersion'])
            current, candidate = report['policies']
            self.assertEqual(current['selections']['first.json']['fetchedCards'], 3)
            self.assertEqual(candidate['selections']['first.json']['fetchedCards'], 2)
            self.assertEqual(candidate['selections']['second.json']['fetchedCards'], 1)
            self.assertEqual(len(candidate['selections']), 6)
            self.assertEqual(candidate['selections']['probe:largest-group-single']['fetchedCards'], 2)
            self.assertEqual({str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}, before)

    def test_partition_comparison_errors_do_not_print_partial_json_or_write_files(self):
        with self.workspace():
            Path('public/cards_detailed.json').write_text(json.dumps([{'id': 'A-001', 'name': 'Card'}]))
            Path('public/cards_preview.json').write_text('[]')
            Path('valid.json').write_text('{"mainDeck":[{"id":"A-001"}]}')
            Path('unknown.json').write_text('{"mainDeck":[{"id":"MISSING"}]}')
            Path('invalid.json').write_text('{')
            for options in (['--max-cards', '0'], ['--max-bytes', '-1'], ['--deck', 'unknown.json'],
                            ['--deck', 'invalid.json'], ['--deck', 'valid.json', '--deck', 'valid.json'],
                            ['--check-output', 'missing-build']):
                before = {str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}
                output = io.StringIO()
                with self.subTest(options=options), contextlib.redirect_stdout(output), contextlib.redirect_stderr(io.StringIO()), patch.object(sys, 'argv', ['compare_partitions', *options]), self.assertRaises(SystemExit) as result:
                    self.run_module('tools.card_data.compare_partitions')
                self.assertEqual(result.exception.code, 1)
                self.assertEqual(output.getvalue(), '')
                self.assertEqual({str(p): p.read_bytes() for p in Path('.').rglob('*') if p.is_file()}, before)

    def run_module(self, name):
        # Discovery may already have imported this module via its parser tests.
        # Execute a fresh __main__ namespace, then restore the discovered modules.
        with patch.dict(sys.modules):
            sys.modules.pop(name, None)
            runpy.run_module(name, run_name='__main__')

    @contextlib.contextmanager
    def workspace(self):
        previous = Path.cwd()
        with tempfile.TemporaryDirectory() as folder:
            os.chdir(folder)
            Path('public').mkdir()
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    yield
            finally:
                os.chdir(previous)

    def test_official_list_module_writes_existing_output_path(self):
        html = b'<a href="/cardlist/?cardno=TEST-001"><img src="/card.png" alt="Test"></a>'
        with self.workspace(), patch('urllib.request.urlopen', return_value=io.BytesIO(html)):
            self.run_module('tools.official_cards.scraper')
            cards = json.loads(Path('public/cards.json').read_text())
            self.assertEqual(len(cards), 1)
            self.assertEqual(cards[0]['id'], 'TEST-001')
            self.assertEqual(cards[0]['name'], 'Test')
            self.assertFalse(Path('public/cards_detailed.json').exists())

    def test_official_details_module_reads_and_writes_existing_paths(self):
        html = '<div class="info"><dl><dt>クラス</dt><dd>ニュートラル</dd></dl><dl><dt>カード種類</dt><dd>トレジャー・トークン</dd></dl></div>'
        response = AsyncMock()
        response.status = 200
        response.text.return_value = html
        request = MagicMock()
        request.__aenter__ = AsyncMock(return_value=response)
        request.__aexit__ = AsyncMock(return_value=False)
        session = MagicMock()
        session.get.return_value = request
        client = MagicMock()
        client.__aenter__ = AsyncMock(return_value=session)
        client.__aexit__ = AsyncMock(return_value=False)
        with self.workspace(), patch('aiohttp.TCPConnector'), patch('aiohttp.ClientSession', return_value=client), patch('asyncio.sleep', new_callable=AsyncMock):
            initial = [{'id': 'TEST-T01', 'name': 'Treasure', 'image': ''}]
            Path('public/cards.json').write_text(json.dumps(initial))
            self.run_module('tools.official_cards.scrape_details')
            result = json.loads(Path('public/cards_detailed.json').read_text())
            self.assertEqual(result[0]['card_kind_normalized'], 'token_treasure')
            self.assertEqual(result[0]['deck_section'], 'token')
            self.assertEqual(json.loads(Path('public/cards.json').read_text()), initial)

    def test_official_incremental_module_dry_run_preserves_existing_files(self):
        from tools.official_cards.scraper import CardIndexResult

        initial_summary = [{'id': 'TEST-001', 'name': 'Test', 'image': '/test.png'}]
        initial_detail = [{
            **initial_summary[0],
            'class': 'エルフ', 'type': 'フォロワー', 'subtype': '妖精',
            'cost': '1', 'atk': '1', 'hp': '1',
            'card_kind_normalized': 'follower', 'deck_section': 'main',
            'is_token': False, 'is_evolve_card': False, 'is_deck_build_legal': True,
        }]
        official = [
            {'id': 'NEW-001', 'name': 'New', 'image': '/new.png'},
            initial_summary[0],
        ]
        with self.workspace():
            Path('public/cards.json').write_text(json.dumps(initial_summary))
            Path('public/cards_detailed.json').write_text(json.dumps(initial_detail))
            before = {p: p.read_bytes() for p in Path('public').iterdir()}
            with patch(
                'tools.official_cards.scraper.fetch_all_cards',
                return_value=CardIndexResult(official, 2, 1),
            ), patch.object(sys, 'argv', ['sync_incremental', '--dry-run']):
                self.run_module('tools.official_cards.sync_incremental')
            self.assertEqual({p: p.read_bytes() for p in Path('public').iterdir()}, before)

    def test_audit_modules_read_existing_paths_and_exit_on_invalid_data(self):
        valid = {
            'id': 'TEST-001', 'name': 'Test', 'image': '/test.png',
            'class': 'エルフ', 'type': 'フォロワー', 'subtype': '妖精', 'cost': '1',
            'atk': '1', 'hp': '1', 'ability_text': 'Test ability',
            'card_kind_normalized': 'follower', 'deck_section': 'main',
            'is_token': False, 'is_evolve_card': False, 'is_deck_build_legal': True,
        }
        for module, target in [
            ('tools.card_data.audit_cards', 'public/cards_detailed.json'),
            ('tools.card_data.audit_preview_cards', 'public/cards_preview.json'),
        ]:
            with self.subTest(module=module), self.workspace():
                Path('public/cards_detailed.json').write_text('[]')
                Path('public/cards_preview.json').write_text('[]')
                for cards, expected in [([valid], 0), ([valid, valid], 1)]:
                    Path(target).write_text(json.dumps(cards))
                    before = {p: p.read_bytes() for p in Path('public').iterdir()}
                    with self.assertRaises(SystemExit) as result:
                        self.run_module(module)
                    self.assertEqual(result.exception.code, expected)
                    self.assertEqual({p: p.read_bytes() for p in Path('public').iterdir()}, before)
