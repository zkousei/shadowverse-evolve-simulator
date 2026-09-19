import argparse
import asyncio
import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Awaitable, Callable, Optional

from tools.card_data.audit_cards import (
    collect_inconsistent_classification,
    collect_missing_classification,
    collect_missing_core_details,
    collect_missing_required_fields,
    collect_numeric_format_issues,
    collect_unknown_types,
    find_duplicate_ids,
)
from tools.official_cards.scrape_details import clean_text, fetch_card_details
from tools.official_cards.scraper import CardIndexResult, fetch_all_cards


LIST_PATH = Path("public/cards.json")
DETAIL_PATH = Path("public/cards_detailed.json")


@dataclass(frozen=True)
class IncrementalSyncResult:
    official_count: int
    existing_count: int
    new_ids: list[str]
    local_only_ids: list[str]
    dry_run: bool


def load_json_list(path: Path) -> list[dict]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise RuntimeError(f"Required catalog does not exist: {path}") from error
    except json.JSONDecodeError as error:
        raise RuntimeError(f"Catalog is not valid JSON: {path}: {error}") from error
    if not isinstance(value, list) or not all(isinstance(card, dict) for card in value):
        raise RuntimeError(f"Catalog must contain a JSON array of objects: {path}")
    return value


def index_unique_cards(cards: list[dict], label: str) -> dict[str, dict]:
    indexed: dict[str, dict] = {}
    for card in cards:
        card_id = card.get("id")
        if not isinstance(card_id, str) or not card_id:
            raise RuntimeError(f"{label} contains a card without a valid id")
        if card_id in indexed:
            raise RuntimeError(f"{label} contains duplicate id: {card_id}")
        indexed[card_id] = card
    return indexed


def summary_from_detail(card: dict) -> dict:
    return {key: card[key] for key in ("id", "name", "image") if key in card}


def validate_detailed_cards(cards: list[dict]) -> None:
    checks = (
        ("duplicate ids", find_duplicate_ids(cards)),
        ("missing required fields", collect_missing_required_fields(cards)),
        ("missing core details", collect_missing_core_details(cards)),
        ("numeric format issues", collect_numeric_format_issues(cards)),
        ("unknown card types", collect_unknown_types(cards)),
        ("missing classification", collect_missing_classification(cards)),
        ("inconsistent classification", collect_inconsistent_classification(cards)),
    )
    problems = [(label, values) for label, values in checks if values]
    if problems:
        descriptions = []
        for label, values in problems:
            sample = values[0]
            sample_id = sample if isinstance(sample, str) else sample.get("id", "UNKNOWN")
            descriptions.append(f"{label} ({len(values)}, e.g. {sample_id})")
        raise RuntimeError("Detailed catalog validation failed: " + "; ".join(descriptions))


def stage_json(path: Path, cards: list[dict]) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=f".{path.name}.",
        suffix=".tmp",
        delete=False,
    )
    staged_path = Path(handle.name)
    try:
        with handle:
            json.dump(cards, handle, ensure_ascii=False, indent=2)
        json.loads(staged_path.read_text(encoding="utf-8"))
        return staged_path
    except Exception:
        staged_path.unlink(missing_ok=True)
        raise


def write_catalogs(
    list_path: Path,
    summaries: list[dict],
    detail_path: Path,
    details: list[dict],
) -> None:
    staged_list: Optional[Path] = None
    staged_details: Optional[Path] = None
    try:
        staged_list = stage_json(list_path, summaries)
        staged_details = stage_json(detail_path, details)
        os.replace(staged_details, detail_path)
        staged_details = None
        os.replace(staged_list, list_path)
        staged_list = None
    finally:
        if staged_list is not None:
            staged_list.unlink(missing_ok=True)
        if staged_details is not None:
            staged_details.unlink(missing_ok=True)


async def run_incremental_sync(
    *,
    list_path: Path = LIST_PATH,
    detail_path: Path = DETAIL_PATH,
    dry_run: bool = False,
    fetch_index: Optional[Callable[[], CardIndexResult]] = None,
    fetch_details: Optional[Callable[[list[dict]], Awaitable[list[dict]]]] = None,
) -> IncrementalSyncResult:
    fetch_index = fetch_index or fetch_all_cards
    fetch_details = fetch_details or fetch_card_details

    existing_summaries = load_json_list(list_path)
    existing_details = load_json_list(detail_path)
    existing_summary_by_id = index_unique_cards(existing_summaries, str(list_path))
    existing_detail_by_id = index_unique_cards(existing_details, str(detail_path))

    index_result = fetch_index()
    official_by_id = index_unique_cards(index_result.cards, "official card index")
    official_ids = list(official_by_id)
    new_cards = [
        official_by_id[card_id]
        for card_id in official_ids
        if card_id not in existing_detail_by_id
    ]
    local_only_ids = [card_id for card_id in existing_detail_by_id if card_id not in official_by_id]
    result = IncrementalSyncResult(
        official_count=len(index_result.cards),
        existing_count=len(existing_details),
        new_ids=[card["id"] for card in new_cards],
        local_only_ids=local_only_ids,
        dry_run=dry_run,
    )
    if dry_run:
        return result

    fetched_new = await fetch_details(new_cards) if new_cards else []
    fetched_new_by_id = index_unique_cards(fetched_new, "fetched new card details")
    expected_new_ids = {card["id"] for card in new_cards}
    if set(fetched_new_by_id) != expected_new_ids:
        missing = sorted(expected_new_ids - set(fetched_new_by_id))
        extra = sorted(set(fetched_new_by_id) - expected_new_ids)
        raise RuntimeError(f"Fetched detail ids did not match new ids; missing={missing}, extra={extra}")

    incomplete_ids = [
        card_id
        for card_id, card in fetched_new_by_id.items()
        if collect_missing_core_details([card])
    ]
    if incomplete_ids:
        raise RuntimeError("New card details remain incomplete: " + ", ".join(incomplete_ids))

    merged_summaries = [dict(card) for card in index_result.cards]
    merged_details: list[dict] = []
    for card_id in official_ids:
        summary = official_by_id[card_id]
        if card_id in fetched_new_by_id:
            merged_details.append(fetched_new_by_id[card_id])
            continue
        existing = dict(existing_detail_by_id[card_id])
        existing.update({
            "id": summary["id"],
            "name": clean_text(summary["name"]),
            "image": summary["image"],
        })
        merged_details.append(existing)

    for card_id in local_only_ids:
        detail = existing_detail_by_id[card_id]
        summary = existing_summary_by_id.get(card_id) or summary_from_detail(detail)
        merged_summaries.append(dict(summary))
        merged_details.append(dict(detail))

    summary_ids = list(index_unique_cards(merged_summaries, "merged card index"))
    detail_ids = list(index_unique_cards(merged_details, "merged detailed catalog"))
    if summary_ids != detail_ids:
        raise RuntimeError("Merged summary and detailed catalogs do not have matching ordered ids")
    validate_detailed_cards(merged_details)
    write_catalogs(list_path, merged_summaries, detail_path, merged_details)
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch details only for cards missing from the local official catalog."
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report differences without fetching details or writing files.",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    result = await run_incremental_sync(dry_run=args.dry_run)
    print(f"Official cards: {result.official_count}")
    print(f"Existing detailed cards: {result.existing_count}")
    print(f"New cards: {len(result.new_ids)}")
    if result.new_ids:
        print("New card ids: " + ", ".join(result.new_ids))
    if result.local_only_ids:
        print("Warning: preserving local-only ids: " + ", ".join(result.local_only_ids))
    if result.dry_run:
        print("Dry run complete; no files were changed.")
    else:
        print(f"Saved {result.official_count + len(result.local_only_ids)} cards.")


if __name__ == "__main__":
    asyncio.run(main())
