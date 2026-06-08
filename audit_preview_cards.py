import json
from collections import Counter
from pathlib import Path

from card_metadata import DECK_SECTION_BY_CARD_KIND, normalize_card_kind


RELEASED_CARD_DATA_PATH = Path("public/cards_detailed.json")
PREVIEW_CARD_DATA_PATH = Path("public/cards_preview.json")
REQUIRED_FIELDS = ("id", "name")
NUMERIC_FIELDS = ("cost", "atk", "hp")


def load_cards(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, list):
        raise ValueError(f"{path} must contain a JSON array")

    return data


def display_identity(card: dict) -> str:
    return "::".join(
        str(card.get(field, ""))
        for field in ("name", "deck_section", "type", "class")
    )


def collect_missing_required_fields(cards: list[dict]) -> list[dict]:
    return [
        card for card in cards
        if any(not card.get(field) for field in REQUIRED_FIELDS)
    ]


def collect_duplicate_ids(cards: list[dict]) -> list[str]:
    counts = Counter(card.get("id") for card in cards if card.get("id"))
    return [card_id for card_id, count in counts.items() if count > 1]


def collect_numeric_format_issues(cards: list[dict]) -> list[dict]:
    issues = []
    for card in cards:
        for field in NUMERIC_FIELDS:
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


def collect_unknown_types(cards: list[dict]) -> list[dict]:
    return [
        card for card in cards
        if card.get("type") and normalize_card_kind(card.get("type")) is None
    ]


def collect_inconsistent_classification(cards: list[dict]) -> list[dict]:
    inconsistent = []
    for card in cards:
        normalized_kind = normalize_card_kind(card.get("type"))
        if not normalized_kind:
            continue

        expected_section = DECK_SECTION_BY_CARD_KIND[normalized_kind]
        expected_is_token = expected_section == "token"
        expected_is_evolve = expected_section == "evolve"
        expected_is_legal = expected_section != "neither"

        if (
            card.get("card_kind_normalized") != normalized_kind
            or card.get("deck_section") != expected_section
            or card.get("is_token") != expected_is_token
            or card.get("is_evolve_card") != expected_is_evolve
            or card.get("is_deck_build_legal") != expected_is_legal
        ):
            inconsistent.append(card)
    return inconsistent


def collect_missing_related_cards(
    preview_cards: list[dict],
    known_card_ids: set[str],
) -> list[dict]:
    issues = []
    for card in preview_cards:
        for related in card.get("related_cards", []):
            related_id = related.get("id") if isinstance(related, dict) else None
            if related_id and related_id not in known_card_ids:
                issues.append({
                    "id": card.get("id"),
                    "name": card.get("name"),
                    "related_id": related_id,
                })
    return issues


def sample_cards(cards: list[dict], limit: int = 10) -> list[str]:
    return [
        f"{card.get('id', 'UNKNOWN')}\t{card.get('name', 'UNKNOWN')}"
        for card in cards[:limit]
    ]


def print_samples(title: str, cards: list[dict]) -> None:
    if not cards:
        return

    print(title)
    for line in sample_cards(cards):
        print(line)
    print()


def main() -> int:
    released_cards = load_cards(RELEASED_CARD_DATA_PATH)
    preview_cards = load_cards(PREVIEW_CARD_DATA_PATH)
    released_ids = {card.get("id") for card in released_cards if card.get("id")}
    preview_ids = {card.get("id") for card in preview_cards if card.get("id")}
    released_display_keys = {
        display_identity(card)
        for card in released_cards
        if card.get("name")
    }

    duplicate_preview_ids = collect_duplicate_ids(preview_cards)
    released_id_collisions = sorted(preview_ids & released_ids)
    display_collisions = [
        card for card in preview_cards
        if card.get("name") and display_identity(card) in released_display_keys
    ]
    missing_required = collect_missing_required_fields(preview_cards)
    numeric_issues = collect_numeric_format_issues(preview_cards)
    unknown_types = collect_unknown_types(preview_cards)
    inconsistent_classification = collect_inconsistent_classification(preview_cards)
    missing_related_cards = collect_missing_related_cards(
        preview_cards,
        released_ids | preview_ids,
    )

    print(f"Preview card data audit for {PREVIEW_CARD_DATA_PATH}")
    print(f"Released cards: {len(released_cards)}")
    print(f"Preview cards: {len(preview_cards)}")
    print()

    print("[Anomalies]")
    print(f"Duplicate preview ids: {len(duplicate_preview_ids)}")
    print(f"Released id collisions: {len(released_id_collisions)}")
    print(f"Released display collisions: {len(display_collisions)}")
    print(f"Missing required fields: {len(missing_required)}")
    print(f"Numeric format issues: {len(numeric_issues)}")
    print(f"Unknown card types: {len(unknown_types)}")
    print(f"Inconsistent classification: {len(inconsistent_classification)}")
    print(f"Missing related_cards references: {len(missing_related_cards)}")
    print()

    if duplicate_preview_ids:
        print("[Duplicate Preview IDs]")
        for card_id in duplicate_preview_ids[:20]:
            print(card_id)
        print()

    if released_id_collisions:
        print("[Released ID Collisions]")
        for card_id in released_id_collisions[:20]:
            print(card_id)
        print()

    print_samples("[Released Display Collision Samples]", display_collisions)
    print_samples("[Missing Required Field Samples]", missing_required)

    if numeric_issues:
        print("[Numeric Format Issue Samples]")
        for issue in numeric_issues[:10]:
            print(f"{issue.get('id')}\t{issue.get('name')}\t{issue.get('field')}={issue.get('value')}")
        print()

    print_samples("[Unknown Type Samples]", unknown_types)
    print_samples("[Inconsistent Classification Samples]", inconsistent_classification)

    if missing_related_cards:
        print("[Missing related_cards Reference Samples]")
        for issue in missing_related_cards[:10]:
            print(f"{issue.get('id')}\t{issue.get('name')}\trelated_id={issue.get('related_id')}")
        print()

    problems = any((
        duplicate_preview_ids,
        released_id_collisions,
        display_collisions,
        missing_required,
        numeric_issues,
        unknown_types,
        inconsistent_classification,
        missing_related_cards,
    ))
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
