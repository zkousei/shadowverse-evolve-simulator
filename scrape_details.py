import json
import asyncio
import aiohttp
from bs4 import BeautifulSoup

async def fetch_card_detail(session, card):
    url = f"https://shadowverse-evolve.com/cardlist/?cardno={card['id']}"
    try:
        async with session.get(url, timeout=10) as response:
            if response.status != 200:
                return card 
            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')
            
            # Extract details
            info_div = soup.select_one('.info')
            if info_div:
                for dl in info_div.select('dl'):
                    dt = dl.select_one('dt').text.strip() if dl.select_one('dt') else ''
                    dd = dl.select_one('dd').text.strip() if dl.select_one('dd') else ''
                    if dt == 'クラス': card['class'] = dd
                    elif dt == 'カード種類': card['type'] = dd
                    elif dt == 'タイプ': card['subtype'] = dd
            
            status_div = soup.select_one('.status')
            if status_div:
                cost = status_div.select_one('.status-Item-Cost')
                if cost: card['cost'] = cost.text.replace('コスト', '').strip()
                atk = status_div.select_one('.status-Item-Power')
                if atk: card['atk'] = atk.text.replace('攻撃力', '').strip()
                hp = status_div.select_one('.status-Item-Hp')
                if hp: card['hp'] = hp.text.replace('体力', '').strip()
                
            detail_div = soup.select_one('.detail')
            if detail_div:
                # Get the full text, optionally we can replace icon img tags with text
                for img in detail_div.select('img'):
                    alt = img.get('alt', '')
                    img.replace_with(f"[{alt}]")
                card['ability_text'] = detail_div.text.strip().replace('\n', ' ')
            return card
    except Exception as e:
        # Silently fail and rely on partial data
        return card

async def main():
    print("Loading existing cards.json...")
    with open('public/cards.json', 'r', encoding='utf-8') as f:
        cards = json.load(f)
        
    print(f"Loaded {len(cards)} cards. Starting async scrape. This will take a moment.")
    
    # We will process in batches to not overwhelm the server
    BATCH_SIZE = 50
    async with aiohttp.ClientSession(headers={'User-Agent': 'Mozilla/5.0'}) as session:
        for i in range(0, len(cards), BATCH_SIZE):
            batch = cards[i:i+BATCH_SIZE]
            tasks = [fetch_card_detail(session, c) for c in batch]
            updated_batch = await asyncio.gather(*tasks)
            # Update the main list
            for j, updated_card in enumerate(updated_batch):
                cards[i+j] = updated_card
            
            if i % 500 == 0:
                print(f"Processed {i}/{len(cards)} cards...")
                
            # Sleep slightly between batches to be polite
            await asyncio.sleep(0.1)

    with open('public/cards_detailed.json', 'w', encoding='utf-8') as f:
        json.dump(cards, f, ensure_ascii=False, indent=2)
    print("FINISHED! Saved detailed descriptions to public/cards_detailed.json")

if __name__ == '__main__':
    asyncio.run(main())
