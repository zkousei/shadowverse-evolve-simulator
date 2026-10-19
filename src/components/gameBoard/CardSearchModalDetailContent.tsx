import React from 'react';
import type { CardInstance } from '../Card';
import {
  formatAbilityText,
  resolveSelectedCardFaceDetail,
  type CardDetailLookup,
} from '../../utils/card/cardDetails';
import GameBoardCardFacePreview from './GameBoardCardFacePreview';
import { useTranslation } from 'react-i18next';

export interface CardSearchModalDetailContentProps {
  card: CardInstance;
  cardDetailLookup?: CardDetailLookup;
  onClose: () => void;
}

export const CardSearchModalDetailContent: React.FC<CardSearchModalDetailContentProps> = ({
  card,
  cardDetailLookup = {},
  onClose,
}) => {
  const { t } = useTranslation();
  const detail = resolveSelectedCardFaceDetail(cardDetailLookup[card.cardId], card.selectedFaceSide);

  const meta = [detail?.className, detail?.title].filter(Boolean).join(' / ');
  const type = [detail?.type, detail?.subtype].filter(Boolean).join(' / ');
  const stats = detail && detail.atk !== null && detail.hp !== null
    ? `${detail.atk} / ${detail.hp}`
    : null;
  const hasFaces = Boolean(detail?.faces && detail.faces.length > 1);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.45rem' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: '0.85rem', lineHeight: 1.35 }}>
            {detail?.name || card.name}
          </div>
          {meta && (
            <div style={{ color: '#cbd5e1', fontSize: '0.68rem', marginTop: '0.12rem', lineHeight: 1.4 }}>
              {meta}
            </div>
          )}
          {type && (
            <div style={{ color: '#94a3b8', fontSize: '0.66rem', marginTop: '0.08rem', lineHeight: 1.4 }}>
              {type}
            </div>
          )}
          {stats && (
            <div style={{ color: '#e2e8f0', fontSize: '0.68rem', marginTop: '0.12rem', lineHeight: 1.4 }}>
              {t('gameBoard.modals.search.stats')}: {stats}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            padding: '0.12rem 0.45rem',
            borderRadius: '999px',
            cursor: 'pointer',
            fontSize: '0.68rem',
            fontWeight: 'bold'
          }}
        >
          {t('common.buttons.close')}
        </button>
      </div>

      {hasFaces && detail ? (
        <GameBoardCardFacePreview
          card={card}
          detail={detail}
          compact={true}
        />
      ) : (
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingTop: '0.5rem',
          whiteSpace: 'pre-wrap',
          color: '#e5e7eb',
          fontSize: '0.74rem',
          lineHeight: 1.55
        }}>
          {detail?.abilityText
            ? formatAbilityText(detail.abilityText)
            : t('gameBoard.modals.search.noDetailText')}
        </div>
      )}
    </>
  );
};

export default CardSearchModalDetailContent;
