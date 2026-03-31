import unittest

from bs4 import BeautifulSoup

from scrape_details import extract_related_cards, parse_card_detail_html


DETAIL_HTML_WITH_RELATIONS = """
<div class="info">
  <dl><dt>クラス</dt><dd>エルフ</dd></dl>
  <dl><dt>カード種類</dt><dd>フォロワー</dd></dl>
  <dl><dt>タイプ</dt><dd>クリスタリア</dd></dl>
  <dl><dt>レアリティ</dt><dd>SR</dd></dl>
  <dl><dt>収録商品</dt><dd>ブースターパック第2弾「黒銀のバハムート」</dd></dl>
</div>
<div class="status">
  <div class="status-Item-Cost">コスト2</div>
  <div class="status-Item-Power">攻撃力1</div>
  <div class="status-Item-Hp">体力3</div>
</div>
<div class="detail">
  <p><img alt="進化" />[コスト2]：これは進化する。<br />能力テキスト</p>
</div>
<div class="cardlist-Detail_Relation">
  <ul class="cardlist-Result_List cardlist-Result_List_Gallery">
    <li><a href="/cardlist/?cardno=BP02-009"><img alt="クリスタリア・リリィ" title="クリスタリア・リリィ" /></a></li>
    <li><a href="/cardlist/?cardno=BP02-T01"><img alt="フェアリー" title="フェアリー" /></a></li>
  </ul>
</div>
"""

DETAIL_HTML_WITHOUT_RELATIONS = """
<div class="info">
  <dl><dt>クラス</dt><dd>ロイヤル</dd></dl>
  <dl><dt>カード種類</dt><dd>フォロワー・エボルヴ</dd></dl>
  <dl><dt>タイプ</dt><dd>指揮官・貴族</dd></dl>
</div>
<div class="status">
  <div class="status-Item-Cost">コスト-</div>
  <div class="status-Item-Power">攻撃力4</div>
  <div class="status-Item-Hp">体力4</div>
</div>
"""

RELATION_ONLY_HTML = """
<div class="cardlist-Detail_Relation">
  <ul class="cardlist-Result_List cardlist-Result_List_Gallery">
    <li><a href="/cardlist/?cardno=SD07-008"><img title="王断の天宮・スタチウム" /></a></li>
    <li><a href="/cardlist/?cardno=SD07-008"><img alt="重複しても無視される" /></a></li>
    <li><a href="/cardlist/?cardno=SD07-T01" title="スティールナイト"></a></li>
    <li><a href="/cardlist/?cardno="><img alt="無効" /></a></li>
    <li><a href="/cardlist/?cardno=SD07-T02"><img /></a></li>
  </ul>
</div>
"""


class ScrapeDetailsTest(unittest.TestCase):
    def test_parse_card_detail_html_adds_related_cards_without_dropping_existing_fields(self) -> None:
        card = {
            "id": "BP02-008",
            "name": "クリスタリア・リリィ",
            "image": "https://example.com/bp02_008.png",
            "custom_field": "keep-me",
        }

        updated = parse_card_detail_html(card, DETAIL_HTML_WITH_RELATIONS)

        self.assertEqual(updated["id"], "BP02-008")
        self.assertEqual(updated["name"], "クリスタリア・リリィ")
        self.assertEqual(updated["image"], "https://example.com/bp02_008.png")
        self.assertEqual(updated["custom_field"], "keep-me")
        self.assertEqual(updated["class"], "エルフ")
        self.assertEqual(updated["type"], "フォロワー")
        self.assertEqual(updated["subtype"], "クリスタリア")
        self.assertEqual(updated["rarity"], "SR")
        self.assertEqual(updated["product_name"], 'ブースターパック第2弾「黒銀のバハムート」')
        self.assertEqual(updated["cost"], "2")
        self.assertEqual(updated["atk"], "1")
        self.assertEqual(updated["hp"], "3")
        self.assertEqual(updated["ability_text"], "[進化][コスト2]：これは進化する。 能力テキスト")
        self.assertEqual(
            updated["related_cards"],
            [
                {"id": "BP02-009", "name": "クリスタリア・リリィ"},
                {"id": "BP02-T01", "name": "フェアリー"},
            ],
        )
        self.assertEqual(updated["card_kind_normalized"], "follower")
        self.assertEqual(updated["deck_section"], "main")
        self.assertFalse(updated["is_token"])
        self.assertFalse(updated["is_evolve_card"])
        self.assertTrue(updated["is_deck_build_legal"])

    def test_extract_related_cards_dedupes_entries_and_uses_name_fallbacks(self) -> None:
        soup = BeautifulSoup(RELATION_ONLY_HTML, "html.parser")

        self.assertEqual(
            extract_related_cards(soup),
            [
                {"id": "SD07-008", "name": "王断の天宮・スタチウム"},
                {"id": "SD07-T01", "name": "スティールナイト"},
            ],
        )

    def test_parse_card_detail_html_removes_stale_related_cards_when_relation_section_missing(self) -> None:
        card = {
            "id": "SD07-009",
            "name": "王断の天宮・スタチウム",
            "image": "https://example.com/sd07_009.png",
            "related_cards": [{"id": "OLD-001", "name": "old"}],
        }

        updated = parse_card_detail_html(card, DETAIL_HTML_WITHOUT_RELATIONS)

        self.assertNotIn("related_cards", updated)
        self.assertEqual(updated["class"], "ロイヤル")
        self.assertEqual(updated["type"], "フォロワー・エボルヴ")
        self.assertEqual(updated["subtype"], "指揮官・貴族")
        self.assertEqual(updated["cost"], "-")
        self.assertEqual(updated["atk"], "4")
        self.assertEqual(updated["hp"], "4")
        self.assertEqual(updated["card_kind_normalized"], "evolve_follower")
        self.assertEqual(updated["deck_section"], "evolve")


if __name__ == "__main__":
    unittest.main()
