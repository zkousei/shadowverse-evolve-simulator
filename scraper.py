import urllib.request
import json
import re
import time

base_url = "https://shadowverse-evolve.com/cardlist/cardsearch_ex?view=image&page="
# We will do a test run first with 5 pages to make sure it works before hitting all 438.
# Actually let's just do all 438, it takes a minute.
max_page = 438
cards = []

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Referer': 'https://shadowverse-evolve.com/cardlist/'
}

# Regex to find: <a href="/cardlist/?cardno=PCS01-001&view=image"><img src="/wordpress/wp-content/images/cardlist/PCS01/pcs01-001.png" class="object-fit-img" alt="コッコロ" title="コッコロ"></a>
card_pattern = re.compile(r'<a href="/cardlist/\?cardno=([^"]+)&view=image">\s*<img src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>\s*</a>')

print("Starting scraper...")
for page in range(1, max_page + 1):
    req = urllib.request.Request(base_url + str(page) + "&t=" + str(int(time.time())), headers=headers)
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            matches = card_pattern.findall(html)
            for cardno, img_src, name in matches:
                cards.append({
                    "id": cardno,
                    "name": name,
                    "image": "https://shadowverse-evolve.com" + img_src
                })
        if page % 10 == 0:
            print(f"Scraped page {page}/{max_page} ({len(cards)} cards so far)")
    except Exception as e:
        print(f"Failed on page {page}: {e}")
    time.sleep(0.05)

# Deduplicate cards by ID
unique_cards = list({c['id']: c for c in cards}.values())

with open("public/cards.json", "w", encoding="utf-8") as f:
    json.dump(unique_cards, f, ensure_ascii=False, indent=2)

print(f"Saved {len(unique_cards)} cards to public/cards.json!")
