import io
import unittest
from unittest.mock import patch
from urllib.error import URLError

from tools.svestats_preview.source import fetch_cards


class SourceTest(unittest.TestCase):
    @patch('tools.svestats_preview.source.urlopen')
    def test_fetch(self, request):
        request.return_value = io.BytesIO(b'[{"oracle_id":"A"}]')
        self.assertEqual(fetch_cards(), [{'oracle_id': 'A'}])
        self.assertGreater(request.call_args.kwargs['timeout'], 0)

    @patch('tools.svestats_preview.source.urlopen')
    def test_invalid_responses(self, request):
        for body in [b'<html>error</html>', b'{}', b'[null]']:
            request.return_value = io.BytesIO(body)
            with self.assertRaises(ValueError):
                fetch_cards()

    @patch('tools.svestats_preview.source.urlopen')
    def test_network_failure(self, request):
        for error in [URLError('offline'), TimeoutError('timeout')]:
            request.side_effect = error
            with self.assertRaises((URLError, TimeoutError)):
                fetch_cards()
