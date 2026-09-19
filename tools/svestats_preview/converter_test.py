import copy
import json
import unittest
from pathlib import Path

from tools.svestats_preview.converter import convert_card


def fixture():
    return json.loads((Path(__file__).parent / 'fixtures/cards.json').read_text())


class ConverterTest(unittest.TestCase):
    def test_fields_zero_and_image(self):
        card = convert_card(fixture()[0], {'TEST': 'テスト商品'})
        self.assertEqual(card['id'], 'TEST-001')
        self.assertEqual(card['cost'], '0')
        self.assertEqual(card['subtype'], '妖精')
        self.assertEqual(card['ability_text'], '能力\n本文')
        self.assertEqual(card['product_name'], 'テスト商品')
        self.assertNotIn('title', card)
        self.assertEqual(card['image'], 'https://pub-bdbcbaf7e9804fe7a47da87d11c7064c.r2.dev/images/upcoming/TEST-001.png')

    def test_evolve_and_treasure(self):
        evolved = convert_card(fixture()[1], {})
        self.assertEqual(evolved['cost'], '-')
        self.assertEqual(evolved['deck_section'], 'evolve')
        token = convert_card(fixture()[2], {})
        self.assertEqual(token['card_kind_normalized'], 'token_treasure')
        self.assertEqual(token['deck_section'], 'token')
        self.assertEqual(token['image'], '')
        self.assertNotIn('cost', token)

    def test_invalid_inputs(self):
        for field, value in [('oracle_id', ''), ('name', None), ('cost', True), ('atk', -1), ('hp', 'x'), ('card_type', ['未知']), ('tribe', '妖精'), ('image_url', 1)]:
            with self.subTest(field=field, value=value):
                card = copy.deepcopy(fixture()[0])
                card[field] = value
                with self.assertRaises(ValueError):
                    convert_card(card, {})

    def test_spells_advance_and_image_basename(self):
        card = fixture()[0]
        card['card_type'] = ['スペル', 'アドバンス']
        card['image_url'] = 'folder/card image.png'
        result = convert_card(card, {})
        self.assertEqual(result['cost'], '-')
        self.assertTrue(result['image'].endswith('/card%20image.png'))
        self.assertEqual(result['deck_section'], 'evolve')
