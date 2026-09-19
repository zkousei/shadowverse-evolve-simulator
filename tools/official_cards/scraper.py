import json
import re
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from typing import Optional

from bs4 import BeautifulSoup


BASE_SEARCH_URL = "https://shadowverse-evolve.com/cardlist/cardsearch/?view=image"
EXTRA_PAGE_URL = "https://shadowverse-evolve.com/cardlist/cardsearch_ex?view=image&page={page}"
OUTPUT_PATH = "public/cards.json"
MAX_RETRIES = 3
LIST_PAGE_WORKERS = 8

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Referer": "https://shadowverse-evolve.com/cardlist/",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}


@dataclass(frozen=True)
class CardIndexResult:
    cards: list[dict]
    expected_count: Optional[int]
    max_page: int


def fetch_html(url: str) -> str:
    last_error = None
    for attempt in range(1, MAX_RETRIES + 1):
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=20) as response:
                return response.read().decode("utf-8")
        except Exception as err:
            last_error = err
            time.sleep(0.5 * attempt)
    raise RuntimeError(f"Failed to fetch {url}: {last_error}")


def extract_max_page(html: str) -> int:
    match = re.search(r"var max_page = (\d+);", html)
    return int(match.group(1)) if match else 1


def extract_expected_count(html: str) -> Optional[int]:
    match = re.search(r"検索結果<span class=\"num bold\">(\d+)</span>件", html)
    return int(match.group(1)) if match else None


def extract_cards(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    cards = []
    for link in soup.select('a[href*="/cardlist/?cardno="]'):
        img = link.select_one("img")
        if not img:
            continue

        href = link.get("href", "")
        parsed = urllib.parse.urlparse(href)
        card_id = urllib.parse.parse_qs(parsed.query).get("cardno", [None])[0]
        if not card_id:
            continue

        img_src = img.get("src")
        name = img.get("alt", "").strip()
        if not img_src or not name:
            continue

        cards.append({
            "id": card_id,
            "name": name,
            "image": urllib.parse.urljoin("https://shadowverse-evolve.com", img_src),
        })
    return cards


def dedupe_cards(cards: list[dict]) -> list[dict]:
    unique_cards = {}
    for card in cards:
        unique_cards[card["id"]] = card
    return list(unique_cards.values())


def fetch_all_cards() -> CardIndexResult:
    all_cards: list[dict] = []

    first_page_html = fetch_html(BASE_SEARCH_URL)
    max_page = extract_max_page(first_page_html)
    expected_count = extract_expected_count(first_page_html)
    all_cards.extend(extract_cards(first_page_html))

    extra_urls = [EXTRA_PAGE_URL.format(page=page) for page in range(2, max_page + 1)]
    with ThreadPoolExecutor(max_workers=LIST_PAGE_WORKERS) as executor:
        for html in executor.map(fetch_html, extra_urls):
            all_cards.extend(extract_cards(html))

    unique_cards = dedupe_cards(all_cards)
    if expected_count is not None and len(unique_cards) != expected_count:
        raise RuntimeError(
            f"Official index expected {expected_count} cards but fetched {len(unique_cards)} unique cards"
        )

    return CardIndexResult(unique_cards, expected_count, max_page)


def main() -> None:
    print("Starting scraper...")
    result = fetch_all_cards()
    print(f"Discovered and scraped {result.max_page} pages.")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result.cards, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(result.cards)} cards to {OUTPUT_PATH}")
    if result.expected_count is not None:
        print(f"Expected count from official search page: {result.expected_count}")


if __name__ == "__main__":
    main()
