from typing import Optional


CARD_KIND_BY_TYPE = {
    "フォロワー": "follower",
    "フォロワー・エボルヴ": "evolve_follower",
    "スペル": "spell",
    "アミュレット": "amulet",
    "リーダー": "leader",
    "EP": "ep",
    "SEP": "sep",
    "フォロワー・トークン": "token_follower",
    "スペル・トークン": "token_spell",
    "アミュレット・トークン": "token_amulet",
    "イクイップメント・トークン": "token_equipment",
    "フォロワー・アドバンス": "advance_follower",
    "スペル・アドバンス": "advance_spell",
    "アミュレット・アドバンス": "advance_amulet",
    "アミュレット・エボルヴ": "evolve_amulet",
    "スペル・エボルヴ": "evolve_spell",
}

DECK_SECTION_BY_CARD_KIND = {
    "follower": "main",
    "spell": "main",
    "amulet": "main",
    "evolve_follower": "evolve",
    "evolve_amulet": "evolve",
    "evolve_spell": "evolve",
    "advance_follower": "evolve",
    "advance_spell": "evolve",
    "advance_amulet": "evolve",
    "leader": "leader",
    "token_follower": "token",
    "token_spell": "token",
    "token_amulet": "token",
    "token_equipment": "token",
    "ep": "neither",
    "sep": "neither",
}


def normalize_card_kind(card_type: Optional[str]) -> Optional[str]:
    if not card_type:
        return None
    return CARD_KIND_BY_TYPE.get(card_type)


def derive_card_metadata(card: dict) -> dict:
    normalized_kind = normalize_card_kind(card.get("type"))
    if not normalized_kind:
        return card

    deck_section = DECK_SECTION_BY_CARD_KIND[normalized_kind]
    card["card_kind_normalized"] = normalized_kind
    card["deck_section"] = deck_section
    card["is_token"] = deck_section == "token"
    card["is_evolve_card"] = deck_section == "evolve"
    card["is_deck_build_legal"] = deck_section != "neither"
    return card
