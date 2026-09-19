"""Translate svestats records into the application's existing card format."""
import re
from urllib.parse import quote

from tools.card_data.card_metadata import derive_card_metadata

IMAGE_BASE = 'https://pub-bdbcbaf7e9804fe7a47da87d11c7064c.r2.dev/images/upcoming/'
CLASSES = {'エルフ', 'ロイヤル', 'ウィッチ', 'ドラゴン', 'ナイトメア', 'ビショップ', 'ニュートラル'}


def required_text(record: dict, key: str) -> str:
    value = record.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'{record.get("oracle_id", "?")}: missing/invalid {key}')
    return value


def string_list(record: dict, key: str) -> list[str]:
    value = record.get(key, [])
    if not isinstance(value, list) or any(not isinstance(item, str) or not item.strip() for item in value):
        raise ValueError(f'{record.get("oracle_id", "?")}: invalid {key}')
    return value


def convert_card(record: dict, products: dict) -> dict:
    card_id = required_text(record, 'oracle_id')
    if not re.fullmatch(r'[A-Za-z0-9]+-[A-Za-z0-9]+', card_id):
        raise ValueError(f'Invalid card ID: {card_id}')
    card = {
        'id': card_id,
        'name': required_text(record, 'name'),
        'image': '',
        'class': required_text(record, 'class'),
        'type': '・'.join(string_list(record, 'card_type')),
        'subtype': '・'.join(string_list(record, 'tribe')),
    }
    if card['class'] not in CLASSES:
        raise ValueError(f'{card_id}: unknown class {card["class"]}')
    derive_card_metadata(card)
    if 'card_kind_normalized' not in card:
        raise ValueError(f'{card_id}: unknown card type {card["type"]}')
    for key in ('title', 'rarity'):
        value = record.get(key)
        if value is not None:
            if not isinstance(value, str):
                raise ValueError(f'{card_id}: invalid {key}')
            if value:
                card[key] = value
    text = record.get('text')
    if not isinstance(text, str):
        raise ValueError(f'{card_id}: missing/invalid text')
    card['ability_text'] = text
    expansion = required_text(record, 'expansion')
    if expansion in products:
        card['product_name'] = products[expansion]
    for key in ('cost', 'atk', 'hp'):
        value = record.get(key)
        if value is None:
            continue
        if isinstance(value, bool) or not (isinstance(value, int) and value >= 0 or isinstance(value, str) and (value == '-' or re.fullmatch(r'[0-9]+', value))):
            raise ValueError(f'{card_id}: invalid {key}: {value!r}')
        card[key] = str(value)
    if card['deck_section'] == 'evolve':
        card['cost'] = '-'
    image = record.get('image_url')
    if image is not None and not isinstance(image, str):
        raise ValueError(f'{card_id}: invalid image_url')
    if image:
        filename = image.split('/')[-1]
        if not filename or filename in ('.', '..'):
            raise ValueError(f'{card_id}: invalid image filename')
        card['image'] = IMAGE_BASE + quote(filename, safe='')
    return card
