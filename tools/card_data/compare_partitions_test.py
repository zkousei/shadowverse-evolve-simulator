import copy
import json
import unittest

from tools.card_data.compare_partitions import compare_partitions, model_partition, probe_selections
from tools.card_data.generate_catalog import build_catalog, decode_index, json_bytes, sha256
from tools.card_data.measure_catalog import measure_catalog


def fixture():
    return build_catalog([
        {'id': 'A-001', 'name': '日本語', 'cost': '0', 'is_token': False,
         'related_cards': [{'id': 'B-001', 'name': 'Related'}], 'future': {'nested': [0, False, None]}},
        {'id': 'A-002', 'name': 'Two', 'faces': [{'side': 'back', 'name': 'Back', 'ability_text': 'Details'}]},
        {'id': 'A-003', 'name': 'Three'},
        {'id': 'A-004', 'name': 'Four'},
        {'id': 'A-005', 'name': 'Five'},
        {'id': 'B-001', 'name': 'Related', 'related_cards': [{'id': 'A-001', 'name': 'Source'}]},
    ], [])


def details(bundle):
    return {group: json.loads(bundle.files[f'details/{group}.json']) for group in bundle.manifest['details']}


class ComparePartitionsTest(unittest.TestCase):
    def test_card_caps_preserve_every_record_order_index_value_and_reference(self):
        original = fixture()
        candidate = model_partition(original, max_cards=2)
        chunks = details(candidate)
        self.assertEqual([len(cards) for cards in chunks.values()], [2, 2, 1, 1])
        original_cards = [card for cards in details(original).values() for card in cards]
        candidate_cards = [card for cards in chunks.values() for card in cards]
        self.assertEqual(json_bytes(candidate_cards), json_bytes(original_cards))
        previous_index = decode_index(json.loads(original.files['index.json']))
        next_index = decode_index(json.loads(candidate.files['index.json']))
        self.assertEqual(len(previous_index), len(next_index))
        for before, after in zip(previous_index, next_index):
            self.assertEqual({k: v for k, v in after.items() if k != 'detail_group'},
                             {k: v for k, v in before.items() if k != 'detail_group'})
            self.assertIn(after['id'], [card['id'] for card in chunks[after['detail_group']]])
        for group, desc in candidate.manifest['details'].items():
            data = candidate.files[f'details/{group}.json']
            self.assertEqual(desc['bytes'], len(data))
            self.assertEqual(desc['sha256'], sha256(data))
            self.assertEqual(desc['count'], len(chunks[group]))

    def test_byte_caps_include_utf8_array_delimiters_and_allow_a_single_oversized_card(self):
        cards = [{'id': f'A-00{i}', 'name': '日本語', 'ability_text': '文' * (300 if i == 3 else 1)} for i in range(1, 4)]
        original = build_catalog(cards, [])
        records = details(original)['A']
        limit = len(json_bytes(records[:2]))
        candidate = model_partition(original, max_bytes=limit)
        self.assertEqual([len(chunk) for chunk in details(candidate).values()], [2, 1])
        lengths = [len(candidate.files[f'details/{key}.json']) for key in candidate.manifest['details']]
        self.assertEqual(lengths[0], limit)
        self.assertGreater(lengths[1], limit)
        row = compare_partitions(original, {'selected': ['A-003']}, byte_limits=[limit])['policies'][1]
        self.assertEqual(row['oversizedSingleCardGroups'], 1)
        self.assertEqual(row['selections']['selected']['fetchedCards'], 1)

    def test_no_split_is_byte_identical_empty_inputs_work_and_results_are_deterministic(self):
        original = fixture()
        before = copy.deepcopy(original)
        candidate = model_partition(original, max_cards=9999)
        self.assertEqual(candidate, original)
        scenarios = {'first': ['A-001', 'A-001'], 'second': ['A-004']}
        snapshot = copy.deepcopy(scenarios)
        one = compare_partitions(original, scenarios, card_limits=[2], byte_limits=[500])
        self.assertEqual(json_bytes(one), json_bytes(compare_partitions(original, scenarios, card_limits=[2], byte_limits=[500])))
        self.assertEqual(original, before)
        self.assertEqual(scenarios, snapshot)
        empty = compare_partitions(build_catalog([], []), {'empty': []}, card_limits=[1])
        self.assertEqual(empty['policies'][1]['detailGroups'], 0)
        self.assertEqual(empty['policies'][1]['initial'], empty['policies'][1]['all'])

    def test_comparison_counts_metadata_cost_multiple_selections_and_related_cycles(self):
        original = fixture()
        report = compare_partitions(original, {'deck': ['A-001', 'A-001'], 'other': ['A-005']}, card_limits=[1])
        self.assertTrue(report['comparisonOnly'])
        self.assertEqual(report['sourceCatalogVersion'], original.manifest['catalogVersion'])
        current, candidate = report['policies']
        self.assertEqual(current['selections']['deck'], measure_catalog(original, ['A-001', 'A-001'])['scenarios']['selected'])
        self.assertEqual(current['selections']['deck']['fetchedCards'], 6)
        self.assertEqual(candidate['selections']['deck']['fetchedCards'], 2)
        self.assertEqual(candidate['selections']['deck']['relatedCards'], 1)
        self.assertEqual(candidate['selections']['deck']['uniqueRequestedCards'], 1)
        self.assertEqual(candidate['selections']['deck']['requests'], 4)
        self.assertEqual(candidate['selections']['other']['fetchedCards'], 1)
        model = model_partition(original, max_cards=1)
        measured = measure_catalog(model)
        self.assertEqual(candidate['initial'], measured['scenarios']['initial'])
        self.assertEqual(candidate['all'], measured['scenarios']['all'])
        self.assertGreater(candidate['initial']['bytes'], current['initial']['bytes'])
        self.assertEqual(candidate['maxGroupCards'], 1)
        self.assertEqual(candidate['detailGroups'], 6)

    def test_same_product_growth_does_not_increase_selected_chunk_beyond_card_cap(self):
        for count in (4, 12):
            original = build_catalog([{'id': f'A-{i:03}', 'name': f'Card {i}'} for i in range(count)], [])
            row = compare_partitions(original, {'first': ['A-000']}, card_limits=[2])['policies'][1]
            self.assertEqual(row['selections']['first']['fetchedCards'], 2)
            self.assertEqual(row['detailGroups'], count // 2)

    def test_probes_are_reproducible_index_windows_and_one_card_from_the_largest_group(self):
        cards = [{'id': f'A-{i:03}', 'name': f'A {i}'} for i in range(30)]
        cards += [{'id': f'B-{i:03}', 'name': f'B {i}'} for i in range(40)]
        original = build_catalog(cards, [])
        before = copy.deepcopy(original)
        probes = probe_selections(original)
        ids = [card['id'] for card in cards]
        self.assertEqual(probes, {
            'probe:index-first-50': ids[:50], 'probe:index-middle-50': ids[10:60],
            'probe:index-last-50': ids[-50:], 'probe:largest-group-single': ['B-000'],
        })
        self.assertEqual(original, before)
        empty = probe_selections(build_catalog([], []))
        self.assertEqual(set(empty), set(probes))
        self.assertTrue(all(not selection for selection in empty.values()))

    def test_selective_threshold_leaves_equal_or_smaller_groups_byte_identical(self):
        original = fixture()
        threshold = original.manifest['details']['A']['bytes']
        candidate = model_partition(original, max_bytes=1, split_above_bytes=threshold)
        self.assertEqual(candidate, original)
        row = compare_partitions(original, {'deck': ['A-001']},
                                 selective_byte_limits=[(threshold, 1)])['policies'][1]
        self.assertEqual(row['eligibleSourceGroups'], [])
        self.assertEqual(row['splitSourceGroups'], [])
        self.assertEqual(row['oversizedSingleCardGroups'], 0)
        self.assertEqual(row['groupsAboveTargetBytes'], 2)

    def test_selective_split_preserves_untargeted_groups_and_reports_deliberate_cap_exceptions(self):
        small = [{'id': f'A-{i:03}', 'name': 'Small'} for i in range(6)]
        initial = build_catalog(small, [])
        records = details(initial)['A']
        target = len(json_bytes(records[:2]))
        threshold = len(json_bytes(records[:4]))
        cards = small + [{'id': f'B-{i:03}', 'name': 'Small'} for i in range(3)]
        cards += [{'id': 'C-001', 'name': 'Huge', 'ability_text': 'x' * 2000},
                  {'id': 'D-001', 'name': 'Medium', 'ability_text': 'x' * target}]
        original = build_catalog(cards, [])
        self.assertGreater(original.manifest['details']['D']['bytes'], target)
        self.assertLessEqual(original.manifest['details']['D']['bytes'], threshold)
        candidate = model_partition(original, max_bytes=target, split_above_bytes=threshold)
        self.assertEqual([len(chunk) for key, chunk in details(candidate).items() if key.startswith('A@')], [2, 2, 2])
        for group in ('B', 'C', 'D'):
            self.assertEqual(candidate.files[f'details/{group}.json'], original.files[f'details/{group}.json'])
        self.assertEqual(json_bytes([card for chunk in details(candidate).values() for card in chunk]),
                         json_bytes([card for chunk in details(original).values() for card in chunk]))
        row = compare_partitions(original, {'deck': ['A-000', 'D-001']},
                                 selective_byte_limits=[(threshold, target)])['policies'][1]
        self.assertEqual(row['eligibleSourceGroups'], ['A', 'C'])
        self.assertEqual(row['splitSourceGroups'], ['A'])
        self.assertEqual(row['oversizedSingleCardGroups'], 1)
        self.assertEqual(row['groupsAboveTargetBytes'], 3)
        self.assertEqual(row['limits'], {'maxBytes': target, 'splitAboveBytes': threshold})

    def test_selective_threshold_equal_to_target_matches_existing_byte_cap(self):
        original = fixture()
        self.assertEqual(model_partition(original, max_bytes=200),
                         model_partition(original, max_bytes=200, split_above_bytes=200))
        scenarios = {'deck': ['A-001', 'A-001']}
        old = compare_partitions(original, scenarios, card_limits=[2], byte_limits=[200])
        new = compare_partitions(original, scenarios, card_limits=[2], byte_limits=[200],
                                 selective_byte_limits=[(500, 200), (500, 200)])
        self.assertEqual(new['policies'][:-1], old['policies'])

    def test_growth_only_starts_splitting_after_the_original_group_crosses_the_threshold(self):
        cards = [{'id': f'A-{i:03}', 'name': 'Card'} for i in range(6)]
        original = build_catalog(cards[:4], [])
        target = len(json_bytes(details(original)['A'][:2]))
        threshold = original.manifest['details']['A']['bytes']
        self.assertEqual(model_partition(original, max_bytes=target, split_above_bytes=threshold), original)
        grown = build_catalog(cards, [])
        before = copy.deepcopy(grown)
        row = compare_partitions(grown, {'first': ['A-000']},
                                 selective_byte_limits=[(threshold, target)])['policies'][1]
        self.assertEqual(row['selections']['first']['fetchedCards'], 2)
        self.assertEqual(row['splitSourceGroups'], ['A'])
        self.assertEqual(grown, before)

    def test_invalid_selective_thresholds_are_rejected(self):
        for kwargs in ({'max_cards': 2, 'split_above_bytes': 100},
                       {'max_bytes': 200, 'split_above_bytes': 100},
                       {'max_bytes': 1, 'split_above_bytes': 0},
                       {'max_bytes': 1, 'split_above_bytes': True},
                       {'max_bytes': 1, 'split_above_bytes': 2.5}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                model_partition(fixture(), **kwargs)
        for pair in ((), (100,), (100, 200), (100, 50, 25), ('invalid', 50)):
            with self.subTest(pair=pair), self.assertRaises(ValueError):
                compare_partitions(fixture(), {}, selective_byte_limits=[pair])

    def test_invalid_limits_and_unknown_ids_do_not_produce_partial_comparisons(self):
        for kwargs in ({}, {'max_cards': 0}, {'max_cards': True}, {'max_cards': 1.5},
                       {'max_bytes': -1}, {'max_cards': 1, 'max_bytes': 100}):
            with self.subTest(kwargs=kwargs), self.assertRaises(ValueError):
                model_partition(fixture(), **kwargs)
        with self.assertRaisesRegex(ValueError, 'Unknown card IDs.*MISSING'):
            compare_partitions(fixture(), {'valid': ['A-001'], 'bad': ['MISSING']}, card_limits=[2])
