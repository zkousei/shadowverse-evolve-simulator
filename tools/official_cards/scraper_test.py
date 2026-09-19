import unittest
from unittest.mock import patch

from tools.official_cards.scraper import fetch_all_cards


PAGE_ONE = """
<p>検索結果<span class="num bold">2</span>件</p>
<script>var max_page = 2;</script>
<a href="/cardlist/?cardno=NEW-001"><img src="/new.png" alt="New"></a>
"""

PAGE_TWO = """
<a href="/cardlist/?cardno=OLD-001"><img src="/old.png" alt="Old"></a>
"""


class ScraperTest(unittest.TestCase):
    @patch(
        "tools.official_cards.scraper.fetch_html",
        side_effect=lambda url: PAGE_TWO if "page=2" in url else PAGE_ONE,
    )
    def test_fetch_all_cards_returns_complete_deduplicated_index(self, fetch_html) -> None:
        result = fetch_all_cards()

        self.assertEqual([card["id"] for card in result.cards], ["NEW-001", "OLD-001"])
        self.assertEqual(result.expected_count, 2)
        self.assertEqual(result.max_page, 2)
        self.assertEqual(fetch_html.call_count, 2)

    @patch("tools.official_cards.scraper.fetch_html", return_value=PAGE_ONE)
    def test_fetch_all_cards_rejects_incomplete_index(self, _fetch_html) -> None:
        with self.assertRaisesRegex(RuntimeError, "expected 2 cards but fetched 1"):
            fetch_all_cards()


if __name__ == "__main__":
    unittest.main()
