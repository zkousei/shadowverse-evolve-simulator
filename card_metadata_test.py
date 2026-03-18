import unittest

from card_metadata import derive_card_metadata


class CardMetadataTest(unittest.TestCase):
    def assertDerived(
        self,
        card_type: str,
        *,
        card_kind_normalized: str,
        deck_section: str,
        is_token: bool,
        is_evolve_card: bool,
        is_deck_build_legal: bool,
    ) -> None:
        card = derive_card_metadata({"id": "TEST-001", "type": card_type})

        self.assertEqual(card["card_kind_normalized"], card_kind_normalized)
        self.assertEqual(card["deck_section"], deck_section)
        self.assertEqual(card["is_token"], is_token)
        self.assertEqual(card["is_evolve_card"], is_evolve_card)
        self.assertEqual(card["is_deck_build_legal"], is_deck_build_legal)

    def test_main_deck_card_types(self) -> None:
        self.assertDerived(
            "フォロワー",
            card_kind_normalized="follower",
            deck_section="main",
            is_token=False,
            is_evolve_card=False,
            is_deck_build_legal=True,
        )
        self.assertDerived(
            "スペル",
            card_kind_normalized="spell",
            deck_section="main",
            is_token=False,
            is_evolve_card=False,
            is_deck_build_legal=True,
        )

    def test_evolve_deck_card_types_include_advance(self) -> None:
        self.assertDerived(
            "フォロワー・エボルヴ",
            card_kind_normalized="evolve_follower",
            deck_section="evolve",
            is_token=False,
            is_evolve_card=True,
            is_deck_build_legal=True,
        )
        self.assertDerived(
            "フォロワー・アドバンス",
            card_kind_normalized="advance_follower",
            deck_section="evolve",
            is_token=False,
            is_evolve_card=True,
            is_deck_build_legal=True,
        )
        self.assertDerived(
            "スペル・アドバンス",
            card_kind_normalized="advance_spell",
            deck_section="evolve",
            is_token=False,
            is_evolve_card=True,
            is_deck_build_legal=True,
        )
        self.assertDerived(
            "アミュレット・アドバンス",
            card_kind_normalized="advance_amulet",
            deck_section="evolve",
            is_token=False,
            is_evolve_card=True,
            is_deck_build_legal=True,
        )

    def test_special_sections(self) -> None:
        self.assertDerived(
            "リーダー",
            card_kind_normalized="leader",
            deck_section="leader",
            is_token=False,
            is_evolve_card=False,
            is_deck_build_legal=True,
        )
        self.assertDerived(
            "アミュレット・トークン",
            card_kind_normalized="token_amulet",
            deck_section="token",
            is_token=True,
            is_evolve_card=False,
            is_deck_build_legal=True,
        )
        self.assertDerived(
            "SEP",
            card_kind_normalized="sep",
            deck_section="neither",
            is_token=False,
            is_evolve_card=False,
            is_deck_build_legal=False,
        )


if __name__ == "__main__":
    unittest.main()
