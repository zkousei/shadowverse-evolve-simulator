import json
from collections import Counter, defaultdict
from pathlib import Path
from typing import Iterable


CARD_DATA_PATH = Path("public/cards_detailed.json")
ICON_ONLY_PATTERN = r"^\[[^\]]+\]$"
TRUNCATED_ICON_SUFFIXES = ("[攻撃力]", "[体力]", "[コスト]", "[PP]")
CORE_DETAIL_FIELDS = ("class", "type", "subtype", "cost", "atk", "hp")
REQUIRED_FIELDS = ("id", "name", "image")


def load_cards(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def summarize_field_presence(cards: list[dict], fields: Iterable[str]) -> list[str]:
    lines = []
    for field in fields:
        missing = 0
        empty = 0
        dash = 0
        for card in cards:
            if field not in card:
                missing += 1
            elif card[field] == "":
                empty += 1
            elif card[field] == "-":
                dash += 1
        lines.append(f"{field}: missing={missing}, empty={empty}, dash={dash}")
    return lines


def find_duplicate_ids(cards: list[dict]) -> list[str]:
    counts = Counter(card["id"] for card in cards if "id" in card)
    return [card_id for card_id, count in counts.items() if count > 1]


def collect_missing_core_details(cards: list[dict]) -> list[dict]:
    return [
        card for card in cards
        if any(field not in card for field in CORE_DETAIL_FIELDS)
    ]


def collect_missing_required_fields(cards: list[dict]) -> list[dict]:
    return [
        card for card in cards
        if any(not card.get(field) for field in REQUIRED_FIELDS)
    ]


def collect_numeric_format_issues(cards: list[dict]) -> list[dict]:
    issues = []
    for card in cards:
        for field in ("cost", "atk", "hp"):
            value = card.get(field)
            if value is None or value == "-":
                continue
            if not str(value).isdigit():
                issues.append({
                    "id": card.get("id"),
                    "name": card.get("name"),
                    "field": field,
                    "value": value,
                })
    return issues


def collect_icon_only_abilities(cards: list[dict]) -> list[dict]:
    import re

    return [
        card for card in cards
        if isinstance(card.get("ability_text"), str)
        and re.fullmatch(ICON_ONLY_PATTERN, card["ability_text"])
    ]


def collect_truncated_abilities(cards: list[dict]) -> list[dict]:
    return [
        card for card in cards
        if isinstance(card.get("ability_text"), str)
        and card["ability_text"].endswith(TRUNCATED_ICON_SUFFIXES)
    ]


def bucket_by_prefix(cards: list[dict]) -> dict[str, int]:
    counts: defaultdict[str, int] = defaultdict(int)
    for card in cards:
        card_id = card.get("id")
        if not card_id:
            counts["UNKNOWN"] += 1
            continue
        counts[card_id.split("-")[0]] += 1
    return dict(sorted(counts.items(), key=lambda item: (-item[1], item[0])))


def sample_cards(cards: list[dict], limit: int = 10) -> list[str]:
    lines = []
    for card in cards[:limit]:
        lines.append(f"{card.get('id', 'UNKNOWN')}\t{card.get('name', 'UNKNOWN')}")
    return lines


def main() -> int:
    cards = load_cards(CARD_DATA_PATH)

    print(f"Card data audit for {CARD_DATA_PATH}")
    print(f"Total cards: {len(cards)}")
    print()

    print("[Field Presence]")
    for line in summarize_field_presence(
        cards,
        (
            "id",
            "name",
            "image",
            "class",
            "title",
            "type",
            "subtype",
            "rarity",
            "product_name",
            "cost",
            "atk",
            "hp",
            "ability_text",
        ),
    ):
        print(line)
    print()

    duplicate_ids = find_duplicate_ids(cards)
    missing_required = collect_missing_required_fields(cards)
    missing_core = collect_missing_core_details(cards)
    numeric_issues = collect_numeric_format_issues(cards)
    icon_only = collect_icon_only_abilities(cards)
    truncated = collect_truncated_abilities(cards)

    print("[Anomalies]")
    print(f"Duplicate ids: {len(duplicate_ids)}")
    print(f"Missing required fields: {len(missing_required)}")
    print(f"Missing core details: {len(missing_core)}")
    print(f"Numeric format issues: {len(numeric_issues)}")
    print(f"Icon-only ability_text: {len(icon_only)}")
    print(f"Likely truncated ability_text: {len(truncated)}")
    print()

    if missing_core:
        print("[Missing Core Details By Prefix]")
        for prefix, count in bucket_by_prefix(missing_core).items():
            print(f"{prefix}: {count}")
        print("Samples:")
        for line in sample_cards(missing_core):
            print(line)
        print()

    if icon_only:
        print("[Icon-only ability_text By Prefix]")
        for prefix, count in list(bucket_by_prefix(icon_only).items())[:15]:
            print(f"{prefix}: {count}")
        print("Samples:")
        for line in sample_cards(icon_only):
            print(line)
        print()

    if truncated:
        print("[Likely Truncated ability_text Samples]")
        for card in truncated[:10]:
            print(f"{card.get('id')}\t{card.get('name')}\t{card.get('ability_text')}")
        print()

    problems = any((
        duplicate_ids,
        missing_required,
        missing_core,
        numeric_issues,
        icon_only,
        truncated,
    ))
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
