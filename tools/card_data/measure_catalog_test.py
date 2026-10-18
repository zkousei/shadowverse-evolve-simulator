import copy
import gzip
import unittest

from tools.card_data.generate_catalog import build_catalog, json_bytes
from tools.card_data.measure_catalog import exported_deck_ids, measure_catalog


def fixture():
    return build_catalog([
        {'id': 'A-001', 'name': '同名', 'image': '', 'cost': 0, 'is_token': False,
         'related_cards': [{'id': 'B-001'}], 'future_extension': {'x': 1}},
        {'id': 'A-002', 'name': '同名', 'image': '', 'cost': False},
        {'id': 'C-001', 'name': 'Unused', 'image': ''},
    ], [
        {'id': 'A-001', 'name': 'Ignored duplicate', 'image': ''},
        {'id': 'B-001', 'name': '関連', 'image': '', 'related_cards': [{'id': 'A-001'}]},
    ])


def measured(files):
    return {'bytes': sum(len(data) for data in files),
            'gzipBytes': sum(len(gzip.compress(data, mtime=0)) for data in files)}


class MeasureCatalogTest(unittest.TestCase):
    def test_initial_selected_and_all_count_independent_files_and_group_overfetch(self):
        bundle = fixture()
        report = measure_catalog(bundle, ['A-001', 'A-001'])
        initial = [bundle.manifest_bytes, bundle.files['index.json']]
        self.assertEqual(report['counts'], {'released': 3, 'preview': 1, 'total': 4})
        self.assertEqual(report['catalogVersion'], bundle.manifest['catalogVersion'])
        self.assertEqual(report['scenarios']['initial'], {
            'requests': 2, 'groups': [], 'fetchedCards': 0, **measured(initial)})
        self.assertEqual(report['scenarios']['selected'], {
            'requestedEntries': 2, 'uniqueRequestedCards': 1, 'relatedCards': 1,
            'requests': 4, 'groups': ['A', 'B'], 'fetchedCards': 3,
            **measured(initial + [bundle.files['details/A.json'], bundle.files['details/B.json']])})
        self.assertEqual(report['scenarios']['all'], {
            'requests': 5, 'groups': ['A', 'B', 'C'], 'fetchedCards': 4,
            **measured([bundle.manifest_bytes, *bundle.files.values()])})

    def test_index_profiles_utf8_value_bytes_absence_types_and_distinct_values(self):
        fields = {entry['field']: entry for entry in measure_catalog(fixture())['indexFields']}
        self.assertEqual(fields['cost'], {'field': 'cost', 'presentCards': 2, 'uniqueValues': 2, 'valueBytes': 6})
        self.assertEqual(fields['is_token'], {'field': 'is_token', 'presentCards': 1, 'uniqueValues': 1, 'valueBytes': 5})
        self.assertEqual(fields['image'], {'field': 'image', 'presentCards': 4, 'uniqueValues': 1, 'valueBytes': 8})
        self.assertEqual(fields['name']['uniqueValues'], 3)
        self.assertEqual(fields['name']['valueBytes'], sum(len(json_bytes(s)) - 1 for s in ['同名', '同名', 'Unused', '関連']))
        self.assertNotIn('future_extension', fields)
        self.assertEqual(fields['detail_group']['presentCards'], 4)

    def test_detail_group_sizes_are_actual_file_sizes_in_deterministic_order(self):
        bundle = fixture()
        report = measure_catalog(bundle)
        self.assertEqual([row['group'] for row in report['detailGroups']], ['A', 'B', 'C'])
        for row in report['detailGroups']:
            self.assertEqual({key: row[key] for key in ('bytes', 'gzipBytes')}, measured([bundle.files[f'details/{row["group"]}.json']]))
        self.assertEqual([row['cards'] for row in report['detailGroups']], [2, 1, 1])

    def test_measurement_is_repeatable_and_does_not_mutate_inputs_or_generated_data(self):
        bundle = fixture()
        before = copy.deepcopy(bundle)
        selected = ['B-001', 'A-001', 'B-001']
        report = measure_catalog(bundle, selected)
        self.assertEqual(json_bytes(report), json_bytes(measure_catalog(bundle, selected)))
        self.assertEqual(bundle, before)
        self.assertEqual(selected, ['B-001', 'A-001', 'B-001'])

    def test_unknown_ids_are_rejected_instead_of_underreporting_a_partial_deck(self):
        with self.assertRaisesRegex(ValueError, 'Unknown card IDs.*MISSING'):
            measure_catalog(fixture(), ['A-001', 'MISSING'])

    def test_empty_catalog_and_selection_require_only_manifest_and_index(self):
        report = measure_catalog(build_catalog([], []))
        initial = report['scenarios']['initial']
        self.assertEqual(report['scenarios']['all'], initial)
        self.assertEqual(report['scenarios']['selected'], {
            **initial, 'requestedEntries': 0, 'uniqueRequestedCards': 0, 'relatedCards': 0})
        self.assertEqual(report['indexFields'], [])
        self.assertEqual(report['detailGroups'], [])

    def test_card_growth_distinguishes_larger_groups_from_more_requested_files(self):
        first = {'id': 'A-001', 'name': 'First'}
        baseline = measure_catalog(build_catalog([first], []), ['A-001'])
        expanded = measure_catalog(build_catalog([first, {'id': 'A-002', 'name': 'Same group'},
                                                  {'id': 'B-001', 'name': 'New group'}], []), ['A-001'])
        self.assertEqual(baseline['scenarios']['selected']['requests'], 3)
        self.assertEqual(expanded['scenarios']['selected']['requests'], 3)
        self.assertEqual(baseline['scenarios']['selected']['fetchedCards'], 1)
        self.assertEqual(expanded['scenarios']['selected']['fetchedCards'], 2)
        self.assertEqual(expanded['scenarios']['all']['requests'], 4)
        self.assertGreater(expanded['scenarios']['selected']['bytes'], baseline['scenarios']['selected']['bytes'])

    def test_exported_deck_collects_all_sections_without_changing_order_or_duplicates(self):
        deck = {'mainDeck': [{'id': 'A-001'}, {'id': 'A-001'}], 'evolveDeck': [{'id': 'A-002'}],
                'leaderCards': [{'id': 'C-001'}], 'tokenDeck': [{'id': 'B-001'}], 'deckName': 'Example'}
        self.assertEqual(exported_deck_ids(deck), ['A-001', 'A-001', 'A-002', 'C-001', 'B-001'])
        self.assertEqual(exported_deck_ids({'mainDeck': []}), [])

    def test_invalid_exported_decks_are_rejected_instead_of_being_measured_as_empty(self):
        for value in (None, [], {}, {'mainDeck': {}}, {'mainDeck': [None]}, {'mainDeck': [{'id': ''}]}, {'mainDeck': [{'id': 0}]}):
            with self.subTest(value=value), self.assertRaises(ValueError):
                exported_deck_ids(value)
