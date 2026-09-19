import unittest
from audit_preview_cards import validate_preview_cards
from card_metadata import derive_card_metadata


class PreviewAuditTest(unittest.TestCase):
    def test_valid_treasure(self):
        card = derive_card_metadata({'id': 'TEST-T01', 'name': '宝物', 'type': 'トレジャー・トークン'})
        self.assertFalse(any(validate_preview_cards([card], []).values()))

    def test_errors_preserved(self):
        card = {'id': 'A', 'name': 'A', 'cost': 'bad', 'type': 'unknown', 'related_cards': [{'id': 'missing'}]}
        result = validate_preview_cards([card, card, {}], [card])
        for key in ('duplicate_ids', 'released_id_collisions', 'display_collisions', 'missing_required', 'numeric_issues', 'unknown_types', 'missing_related_cards'):
            self.assertTrue(result[key], key)
