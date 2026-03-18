import asyncio
import json
import re
from html import unescape
from typing import Optional

import aiohttp
from bs4 import BeautifulSoup


DETAIL_URL_TEMPLATE = "https://shadowverse-evolve.com/cardlist/?cardno={card_id}&view=text"
INPUT_PATH = "public/cards.json"
OUTPUT_PATH = "public/cards_detailed.json"
BATCH_SIZE = 50
MAX_RETRIES = 3
RECOVERY_PASSES = 3

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Referer": "https://shadowverse-evolve.com/cardlist/",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}


def clean_text(value: str) -> str:
    return " ".join(value.split())


def has_core_details(card: dict) -> bool:
    return all(field in card for field in ("class", "type", "subtype", "cost", "atk", "hp"))


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

    soup = BeautifulSoup(html, "html.parser")

    info_div = soup.select_one(".info")
    if info_div:
        for dl in info_div.select("dl"):
            dt = clean_text(dl.select_one("dt").get_text()) if dl.select_one("dt") else ""
            dd = clean_text(dl.select_one("dd").get_text()) if dl.select_one("dd") else ""
            if dt == "クラス":
                card["class"] = dd
            elif dt == "カード種類":
                card["type"] = dd
            elif dt == "タイプ":
                card["subtype"] = dd

    status_div = soup.select_one(".status")
    if status_div:
        cost = status_div.select_one(".status-Item-Cost")
        atk = status_div.select_one(".status-Item-Power")
        hp = status_div.select_one(".status-Item-Hp")
        if cost:
            card["cost"] = clean_text(cost.get_text().replace("コスト", ""))
        if atk:
            card["atk"] = clean_text(atk.get_text().replace("攻撃力", ""))
        if hp:
            card["hp"] = clean_text(hp.get_text().replace("体力", ""))

    detail_div = soup.select_one(".detail")
    if detail_div:
        detail_text = extract_detail_text(detail_div.decode_contents())
        if detail_text:
            card["ability_text"] = detail_text

    return card


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

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print(f"FINISHED! Saved detailed descriptions to {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
