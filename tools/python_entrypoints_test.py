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
