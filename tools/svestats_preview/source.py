"""Public data access; never imported by the application."""
import json
from urllib.request import Request, urlopen

SOURCE_URL = 'https://svestats.cc/data/upcoming.json'
MAX_BYTES = 10 * 1024 * 1024


def fetch_cards() -> list[dict]:
    request = Request(SOURCE_URL, headers={'User-Agent': 'shadowverse-evolve-preview-sync/1.0'})
    with urlopen(request, timeout=30) as response:
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise ValueError('Source exceeds 10 MiB')
    cards = json.loads(body)
    if not isinstance(cards, list) or any(not isinstance(card, dict) for card in cards):
        raise ValueError('Source must be an array of card objects')
    return cards
