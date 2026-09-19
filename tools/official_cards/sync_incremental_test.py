import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, Mock

from tools.official_cards.scraper import CardIndexResult
from tools.official_cards.sync_incremental import run_incremental_sync


def summary(card_id: str, name: str, image: str = "https://example.com/card.png") -> dict:
    return {"id": card_id, "name": name, "image": image}


def detailed(card_id: str, name: str, image: str = "https://example.com/card.png") -> dict:
    return {
        **summary(card_id, name, image),
        "class": "エルフ",
        "type": "フォロワー",
        "subtype": "妖精",
        "cost": "1",
        "atk": "1",
        "hp": "1",
        "ability_text": "能力",
        "card_kind_normalized": "follower",
        "deck_section": "main",
        "is_token": False,
        "is_evolve_card": False,
        "is_deck_build_legal": True,
    }


class IncrementalSyncTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        root = Path(self.temp_dir.name)
        self.list_path = root / "cards.json"
        self.detail_path = root / "cards_detailed.json"

    def write_existing(self, summaries: list[dict], details: list[dict]) -> None:
        self.list_path.write_text(json.dumps(summaries), encoding="utf-8")
        self.detail_path.write_text(json.dumps(details), encoding="utf-8")

    async def test_fetches_only_new_cards_and_preserves_existing_details(self) -> None:
        old_summary = summary("OLD-001", "Old name", "https://example.com/old.png")
        old_detail = detailed("OLD-001", "Old name", "https://example.com/old.png")
        old_detail["custom_field"] = "preserved"
        local_only = detailed("LOCAL-001", "Local")
        self.write_existing([old_summary, summary("LOCAL-001", "Local")], [old_detail, local_only])

        official = [
            summary("NEW-001", "New"),
            summary("OLD-001", "Updated name", "https://example.com/updated.png"),
        ]
        new_detail = detailed("NEW-001", "New")
        fetch_index = Mock(return_value=CardIndexResult(official, 2, 1))
        fetch_details = AsyncMock(return_value=[new_detail])

        result = await run_incremental_sync(
            list_path=self.list_path,
            detail_path=self.detail_path,
            fetch_index=fetch_index,
            fetch_details=fetch_details,
        )

        fetch_details.assert_awaited_once_with([official[0]])
        self.assertEqual(result.new_ids, ["NEW-001"])
        self.assertEqual(result.local_only_ids, ["LOCAL-001"])
        summaries = json.loads(self.list_path.read_text(encoding="utf-8"))
        details = json.loads(self.detail_path.read_text(encoding="utf-8"))
        self.assertEqual([card["id"] for card in summaries], ["NEW-001", "OLD-001", "LOCAL-001"])
        self.assertEqual([card["id"] for card in details], ["NEW-001", "OLD-001", "LOCAL-001"])
        self.assertEqual(details[1]["name"], "Updated name")
        self.assertEqual(details[1]["image"], "https://example.com/updated.png")
        self.assertEqual(details[1]["custom_field"], "preserved")

    async def test_does_not_fetch_details_when_there_are_no_new_cards(self) -> None:
        card_summary = summary("OLD-001", "Old")
        self.write_existing([card_summary], [detailed("OLD-001", "Old")])
        fetch_details = AsyncMock()

        result = await run_incremental_sync(
            list_path=self.list_path,
            detail_path=self.detail_path,
            fetch_index=Mock(return_value=CardIndexResult([card_summary], 1, 1)),
            fetch_details=fetch_details,
        )

        fetch_details.assert_not_awaited()
        self.assertEqual(result.new_ids, [])

    async def test_normalizes_existing_detail_name_like_full_detail_scrape(self) -> None:
        official_name = "Legend Race\u3000VS Character"
        detailed_name = "Legend Race VS Character"
        card_summary = summary("OLD-001", official_name)
        self.write_existing([card_summary], [detailed("OLD-001", detailed_name)])

        await run_incremental_sync(
            list_path=self.list_path,
            detail_path=self.detail_path,
            fetch_index=Mock(return_value=CardIndexResult([card_summary], 1, 1)),
            fetch_details=AsyncMock(),
        )

        summaries = json.loads(self.list_path.read_text(encoding="utf-8"))
        details = json.loads(self.detail_path.read_text(encoding="utf-8"))
        self.assertEqual(summaries[0]["name"], official_name)
        self.assertEqual(details[0]["name"], detailed_name)

    async def test_repeated_sync_with_same_index_is_byte_stable(self) -> None:
        card_summary = summary("OLD-001", "Legend Race\u3000VS Character")
        self.write_existing(
            [card_summary],
            [detailed("OLD-001", "Legend Race VS Character")],
        )
        fetch_index = Mock(return_value=CardIndexResult([card_summary], 1, 1))
        fetch_details = AsyncMock()

        await run_incremental_sync(
            list_path=self.list_path,
            detail_path=self.detail_path,
            fetch_index=fetch_index,
            fetch_details=fetch_details,
        )
        first_list = self.list_path.read_bytes()
        first_details = self.detail_path.read_bytes()

        await run_incremental_sync(
            list_path=self.list_path,
            detail_path=self.detail_path,
            fetch_index=fetch_index,
            fetch_details=fetch_details,
        )

        fetch_details.assert_not_awaited()
        self.assertEqual(self.list_path.read_bytes(), first_list)
        self.assertEqual(self.detail_path.read_bytes(), first_details)

    async def test_writes_same_eof_style_as_full_fetch(self) -> None:
        card_summary = summary("OLD-001", "Old")
        self.write_existing([card_summary], [detailed("OLD-001", "Old")])

        await run_incremental_sync(
            list_path=self.list_path,
            detail_path=self.detail_path,
            fetch_index=Mock(return_value=CardIndexResult([card_summary], 1, 1)),
            fetch_details=AsyncMock(),
        )

        self.assertFalse(self.list_path.read_bytes().endswith(b"\n"))
        self.assertFalse(self.detail_path.read_bytes().endswith(b"\n"))

    async def test_incomplete_new_detail_does_not_modify_existing_files(self) -> None:
        old_summary = summary("OLD-001", "Old")
        self.write_existing([old_summary], [detailed("OLD-001", "Old")])
        before_list = self.list_path.read_bytes()
        before_details = self.detail_path.read_bytes()
        new_summary = summary("NEW-001", "New")

        with self.assertRaisesRegex(RuntimeError, "NEW-001"):
            await run_incremental_sync(
                list_path=self.list_path,
                detail_path=self.detail_path,
                fetch_index=Mock(return_value=CardIndexResult([new_summary, old_summary], 2, 1)),
                fetch_details=AsyncMock(return_value=[new_summary]),
            )

        self.assertEqual(self.list_path.read_bytes(), before_list)
        self.assertEqual(self.detail_path.read_bytes(), before_details)

    async def test_dry_run_reports_new_cards_without_fetching_or_writing(self) -> None:
        old_summary = summary("OLD-001", "Old")
        self.write_existing([old_summary], [detailed("OLD-001", "Old")])
        before_list = self.list_path.read_bytes()
        before_details = self.detail_path.read_bytes()
        fetch_details = AsyncMock()

        result = await run_incremental_sync(
            list_path=self.list_path,
            detail_path=self.detail_path,
            fetch_index=Mock(return_value=CardIndexResult([summary("NEW-001", "New"), old_summary], 2, 1)),
            fetch_details=fetch_details,
            dry_run=True,
        )

        fetch_details.assert_not_awaited()
        self.assertEqual(result.new_ids, ["NEW-001"])
        self.assertEqual(self.list_path.read_bytes(), before_list)
        self.assertEqual(self.detail_path.read_bytes(), before_details)


if __name__ == "__main__":
    unittest.main()
