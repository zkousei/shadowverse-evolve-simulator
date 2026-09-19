import json
import re
import time
import urllib.parse
import urllib.request
from typing import Optional

from bs4 import BeautifulSoup


BASE_SEARCH_URL = "https://shadowverse-evolve.com/cardlist/cardsearch/?view=image"
EXTRA_PAGE_URL = "https://shadowverse-evolve.com/cardlist/cardsearch_ex?view=image&page={page}"
OUTPUT_PATH = "public/cards.json"
REQUEST_DELAY_SECONDS = 0.05
MAX_RETRIES = 3

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Referer": "https://shadowverse-evolve.com/cardlist/",
    "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
}


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


def main() -> None:
    print("Starting scraper...")
    all_cards: list[dict] = []

    first_page_html = fetch_html(BASE_SEARCH_URL)
    max_page = extract_max_page(first_page_html)
    expected_count = extract_expected_count(first_page_html)
    first_page_cards = extract_cards(first_page_html)
    all_cards.extend(first_page_cards)
    print(f"Discovered {max_page} pages.")
    print(f"Scraped page 1/{max_page} ({len(all_cards)} cards so far)")

    for page in range(2, max_page + 1):
        html = fetch_html(EXTRA_PAGE_URL.format(page=page))
        page_cards = extract_cards(html)
        all_cards.extend(page_cards)
        if page % 10 == 0 or page == max_page:
            print(f"Scraped page {page}/{max_page} ({len(all_cards)} cards so far)")
        time.sleep(REQUEST_DELAY_SECONDS)

    unique_cards = dedupe_cards(all_cards)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(unique_cards, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(unique_cards)} cards to {OUTPUT_PATH}")
    if expected_count is not None:
        print(f"Expected count from official search page: {expected_count}")


if __name__ == "__main__":
    main()
