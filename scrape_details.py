import asyncio
import json
import re
import urllib.parse
from html import unescape
from typing import Optional

import aiohttp
from bs4 import BeautifulSoup
from card_metadata import derive_card_metadata


DETAIL_URL_TEMPLATE = "https://shadowverse-evolve.com/cardlist/?cardno={card_id}&view=text"
CARD_SITE_ORIGIN = "https://shadowverse-evolve.com"
INPUT_PATH = "public/cards.json"
OUTPUT_PATH = "public/cards_detailed.json"
BATCH_SIZE = 50
MAX_RETRIES = 3
RECOVERY_PASSES = 3

CARD_FIELD_ORDER = [
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
    "related_cards",
    "faces",
    "card_kind_normalized",
    "deck_section",
    "is_token",
    "is_evolve_card",
    "is_deck_build_legal",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://shadowverse-evolve.com/cardlist/",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}


def clean_text(value: str) -> str:
    return " ".join(value.split())


def first_nonempty_text(*values: Optional[str]) -> Optional[str]:
    for value in values:
        if not value:
            continue

        cleaned = clean_text(value)
        if cleaned:
            return cleaned

    return None


def has_core_details(card: dict) -> bool:
    return all(field in card for field in ("class", "type", "subtype", "cost", "atk", "hp"))


def order_card_fields(card: dict) -> dict:
    ordered = {key: card[key] for key in CARD_FIELD_ORDER if key in card}
    for key, value in card.items():
        if key not in ordered:
            ordered[key] = value
    return ordered


def extract_detail_text(detail_html: str) -> str:
    text = re.sub(
        r"<img\b[^>]*\balt=\"([^\"]*)\"[^>]*>",
        lambda match: f"[{match.group(1)}]",
        detail_html,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p\s*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<p\b[^>]*>", "", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text)
    lines = [clean_text(line) for line in text.splitlines()]
    lines = [line for line in lines if line]
    return " ".join(lines)


def extract_related_cards(soup: BeautifulSoup) -> list[dict[str, str]]:
    relation_div = soup.select_one(".cardlist-Detail_Relation")
    if not relation_div:
        return []

    related_cards: list[dict[str, str]] = []
    seen_ids: set[str] = set()

    for link in relation_div.select('a[href*="/cardlist/?cardno="]'):
        href = link.get("href", "")
        parsed = urllib.parse.urlparse(href)
        related_card_id = urllib.parse.parse_qs(parsed.query).get("cardno", [None])[0]
        if not related_card_id or related_card_id in seen_ids:
            continue

        image = link.select_one("img")
        related_card_name = first_nonempty_text(
            image.get("alt") if image else None,
            image.get("title") if image else None,
            link.get("title"),
            link.get_text(" ", strip=True),
        )
        if not related_card_name:
            continue

        related_cards.append({
            "id": related_card_id,
            "name": related_card_name,
        })
        seen_ids.add(related_card_id)

    return related_cards


def detail_side_name(index: int) -> str:
    if index == 0:
        return "front"
    if index == 1:
        return "back"
    return f"face_{index + 1}"


def extract_info_fields(container: BeautifulSoup) -> dict:
    fields = {}
    info_div = container.select_one(".info")
    if not info_div:
        return fields

    for dl in info_div.select("dl"):
        dt = clean_text(dl.select_one("dt").get_text()) if dl.select_one("dt") else ""
        dd = clean_text(dl.select_one("dd").get_text()) if dl.select_one("dd") else ""
        if dt == "クラス":
            fields["class"] = dd
        elif dt == "タイトル":
            fields["title"] = dd
        elif dt == "カード種類":
            fields["type"] = dd
        elif dt == "タイプ":
            fields["subtype"] = dd
        elif dt == "レアリティ":
            fields["rarity"] = dd
        elif dt == "収録商品":
            fields["product_name"] = dd

    return fields


def extract_status_fields(container: BeautifulSoup) -> dict:
    fields = {}
    status_div = container.select_one(".status")
    if not status_div:
        return fields

    cost = status_div.select_one(".status-Item-Cost")
    atk = status_div.select_one(".status-Item-Power")
    hp = status_div.select_one(".status-Item-Hp")
    if cost:
        fields["cost"] = clean_text(cost.get_text().replace("コスト", ""))
    if atk:
        fields["atk"] = clean_text(atk.get_text().replace("攻撃力", ""))
    if hp:
        fields["hp"] = clean_text(hp.get_text().replace("体力", ""))

    return fields


def extract_image_url(container: BeautifulSoup) -> Optional[str]:
    image = container.select_one(".img img")
    if not image:
        image = container.select_one('img[src*="/cardlist/"]')
    if not image:
        return None

    image_src = image.get("src")
    if not image_src:
        return None

    return urllib.parse.urljoin(CARD_SITE_ORIGIN, image_src)


def parse_card_face(container: BeautifulSoup, side: str) -> dict:
    face = {"side": side}

    image = container.select_one(".img img")
    title = container.select_one(".ttl")
    name = first_nonempty_text(
        title.get_text(" ", strip=True) if title else None,
        image.get("alt") if image else None,
        image.get("title") if image else None,
    )
    if name:
        face["name"] = name

    image_url = extract_image_url(container)
    if image_url:
        face["image"] = image_url

    face.update(extract_info_fields(container))
    face.update(extract_status_fields(container))

    detail_div = container.select_one(".detail")
    if detail_div:
        detail_text = extract_detail_text(detail_div.decode_contents())
        if detail_text:
            face["ability_text"] = detail_text

    return derive_card_metadata(face)


def parse_card_detail_html(card: dict, html: str) -> dict:
    updated_card = dict(card)
    soup = BeautifulSoup(html, "html.parser")

    face_nodes = soup.select(".cardlist-Detail_Box_Inner") or [soup]
    faces = [
        parse_card_face(face_node, detail_side_name(index))
        for index, face_node in enumerate(face_nodes)
    ]

    primary_face = faces[0] if faces else {}
    for key, value in primary_face.items():
        if key != "side":
            updated_card[key] = value

    if len(faces) > 1:
        updated_card["faces"] = faces
    else:
        updated_card.pop("faces", None)

    related_cards = extract_related_cards(soup)
    if related_cards:
        updated_card["related_cards"] = related_cards
    else:
        updated_card.pop("related_cards", None)

    return order_card_fields(derive_card_metadata(updated_card))


async def fetch_html(session: aiohttp.ClientSession, url: str) -> Optional[str]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with session.get(url, timeout=20) as response:
                if response.status == 200:
                    return await response.text()
        except Exception:
            pass
        await asyncio.sleep(0.4 * attempt)
    return None


async def fetch_card_detail(session: aiohttp.ClientSession, card: dict) -> dict:
    url = DETAIL_URL_TEMPLATE.format(card_id=card["id"])
    html = await fetch_html(session, url)
    if not html:
        return card

    return parse_card_detail_html(card, html)


async def main() -> None:
    print("Loading existing cards.json...")
    with open(INPUT_PATH, "r", encoding="utf-8") as f:
        cards = json.load(f)

    print(f"Loaded {len(cards)} cards. Starting async scrape. This will take a moment.")

    connector = aiohttp.TCPConnector(limit_per_host=10)
    async with aiohttp.ClientSession(headers=HEADERS, connector=connector) as session:
        for i in range(0, len(cards), BATCH_SIZE):
            batch = cards[i:i + BATCH_SIZE]
            updated_batch = await asyncio.gather(*(fetch_card_detail(session, card) for card in batch))
            cards[i:i + BATCH_SIZE] = updated_batch

            if i % 500 == 0:
                print(f"Processed {i}/{len(cards)} cards...")

            await asyncio.sleep(0.1)

        for attempt in range(1, RECOVERY_PASSES + 1):
            missing_indices = [index for index, card in enumerate(cards) if not has_core_details(card)]
            if not missing_indices:
                break

            print(f"Recovery pass {attempt}: retrying {len(missing_indices)} cards with missing core details...")
            for index in missing_indices:
                cards[index] = await fetch_card_detail(session, cards[index])
            await asyncio.sleep(0.2)

    cards = [order_card_fields(derive_card_metadata(card)) for card in cards]

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"FINISHED! Saved detailed descriptions to {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
