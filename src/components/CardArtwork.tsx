import React from 'react';
import type { CardDetail } from '../utils/cardDetails';
import { isDummyCardArtEnabled } from '../utils/cardArtMode';
import type { RuntimeBaseCardType } from '../utils/cardType';

type DummyKind = 'follower' | 'spell' | 'amulet' | 'equipment' | 'leader' | 'token' | 'other';

interface Props {
  image: string;
  alt: string;
  isBack?: boolean;
  detail?: (
    Pick<CardDetail, 'name' | 'cost' | 'atk' | 'hp' | 'type'>
    & { image?: string }
    & { cardKindNormalized?: string }
  ) | undefined;
  baseCardType?: RuntimeBaseCardType | null;
  isLeaderCard?: boolean;
  isTokenCard?: boolean;
  isEvolveCard?: boolean;
  style?: React.CSSProperties;
  draggable?: boolean;
}

const CARD_KIND_STYLES: Record<DummyKind, { background: string; border: string; badge: string }> = {
  follower: {
    background: 'linear-gradient(180deg, #1f2937 0%, #0f172a 100%)',
    border: '#f59e0b',
    badge: '#f59e0b',
  },
  spell: {
    background: 'linear-gradient(180deg, #0f766e 0%, #082f49 100%)',
    border: '#22d3ee',
    badge: '#22d3ee',
  },
  amulet: {
    background: 'linear-gradient(180deg, #4c1d95 0%, #1e1b4b 100%)',
    border: '#c084fc',
    badge: '#c084fc',
  },
  equipment: {
    background: 'linear-gradient(180deg, #713f12 0%, #3f2308 100%)',
    border: '#fbbf24',
    badge: '#fbbf24',
  },
  leader: {
    background: 'linear-gradient(180deg, #7c2d12 0%, #431407 100%)',
    border: '#fb7185',
    badge: '#fb7185',
  },
  token: {
    background: 'linear-gradient(180deg, #3f3f46 0%, #18181b 100%)',
    border: '#d4d4d8',
    badge: '#d4d4d8',
  },
  other: {
    background: 'linear-gradient(180deg, #374151 0%, #111827 100%)',
    border: '#94a3b8',
    badge: '#94a3b8',
  },
};

const resolveDummyKind = (
  detail: (Pick<CardDetail, 'type'> & { cardKindNormalized?: string }) | undefined,
  baseCardType: RuntimeBaseCardType | null | undefined,
  isLeaderCard?: boolean,
  isTokenCard?: boolean
): DummyKind => {
  const normalizedKind = detail?.cardKindNormalized ?? '';

  if (isLeaderCard) return 'leader';
  if (normalizedKind === 'equipment' || normalizedKind === 'token_equipment') return 'equipment';
  if (baseCardType) return baseCardType;
  if (isTokenCard) return 'token';

  const normalizedType = detail?.type?.toLowerCase() ?? '';
  if (normalizedType.includes('leader')) return 'leader';
  if (normalizedType.includes('token')) return 'token';
  if (normalizedType.includes('equipment')) return 'equipment';
  if (normalizedType.includes('follower')) return 'follower';
  if (normalizedType.includes('spell')) return 'spell';
  if (normalizedType.includes('amulet')) return 'amulet';

  return 'other';
};

const formatStat = (value: number | null | undefined) => (value === null || value === undefined ? '-' : String(value));

const resolveSpecialBadge = (
  detail: { cardKindNormalized?: string } | undefined,
  isTokenCard?: boolean,
  isEvolveCard?: boolean
): string | null => {
  const normalizedKind = detail?.cardKindNormalized ?? '';

  if (normalizedKind.startsWith('token_') || isTokenCard) return 'TOKEN';
  if (normalizedKind.startsWith('advance_')) return 'ADVANCE';
  if (normalizedKind.startsWith('evolve_')) return 'EVOLVE';
  if (normalizedKind === 'advance') return 'ADVANCE';
  if (normalizedKind === 'evolve') return 'EVOLVE';

  return isEvolveCard ? 'EVOLVE' : null;
};

const CardArtwork: React.FC<Props> = ({
  image,
  alt,
  isBack = false,
  detail,
  baseCardType,
  isLeaderCard,
  isTokenCard,
  isEvolveCard,
  style,
  draggable,
}) => {
  const resolvedImage = detail?.image || image;

  if (!isDummyCardArtEnabled()) {
    return (
      <img
        src={isBack ? '/card_back.png' : resolvedImage}
        alt={isBack ? 'Card Back' : alt}
        style={style}
        draggable={draggable}
      />
    );
  }

  const baseStyle: React.CSSProperties = {
    aspectRatio: style?.aspectRatio ?? '5 / 7',
    ...style,
  };

  if (isBack) {
    return (
      <div
        aria-label="Card Back"
        style={{
          ...baseStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)',
          border: '2px solid rgba(148, 163, 184, 0.35)',
          boxSizing: 'border-box',
          color: '#cbd5e1',
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          textAlign: 'center',
          padding: '0.75rem',
        }}
      >
        <div>
          <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>Shadowverse Evolve</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.2rem' }}>Card Back</div>
        </div>
      </div>
    );
  }

  const dummyKind = resolveDummyKind(detail, baseCardType, isLeaderCard, isTokenCard);
  const kindStyle = CARD_KIND_STYLES[dummyKind];
  const specialBadge = resolveSpecialBadge(detail, isTokenCard, isEvolveCard);
  const typeLabel = isLeaderCard
    ? 'LEADER'
    : dummyKind.toUpperCase();

  return (
    <div
      aria-label={alt}
      style={{
        ...baseStyle,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: kindStyle.background,
        border: `2px solid ${kindStyle.border}`,
        boxSizing: 'border-box',
        color: 'white',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 6,
          right: 6,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 4,
          maxWidth: '52%',
        }}
      >
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.82)',
            border: `1px solid ${kindStyle.badge}`,
            borderRadius: '999px',
            color: kindStyle.badge,
            fontSize: '0.48rem',
            fontWeight: 800,
            padding: '2px 6px',
            letterSpacing: '0.08em',
            textAlign: 'right',
            whiteSpace: 'nowrap',
          }}
        >
          {typeLabel}
        </div>

        {specialBadge && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.82)',
              border: '1px solid #facc15',
              borderRadius: '999px',
              color: '#fde68a',
              fontSize: '0.44rem',
              fontWeight: 800,
              padding: '2px 5px',
              letterSpacing: '0.08em',
              textAlign: 'right',
              whiteSpace: 'nowrap',
            }}
          >
            {specialBadge}
          </div>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          minWidth: 20,
          height: 20,
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.68rem',
          fontWeight: 900,
          padding: '0 6px',
        }}
      >
        {detail?.cost ?? '-'}
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.7rem 0.55rem 1.9rem' }}>
        <div
          style={{
            textAlign: 'center',
            fontWeight: 800,
            lineHeight: 1.22,
            fontSize: '0.76rem',
            textShadow: '0 1px 3px rgba(0,0,0,0.45)',
            wordBreak: 'break-word',
          }}
        >
          {detail?.name || alt}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          padding: '0.35rem 0.45rem',
          background: 'linear-gradient(180deg, rgba(2, 6, 23, 0) 0%, rgba(2, 6, 23, 0.8) 38%, rgba(2, 6, 23, 0.94) 100%)',
        }}
      >
        <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#fbbf24' }}>{formatStat(detail?.atk)}</span>
        <span style={{ fontSize: '0.86rem', fontWeight: 900, color: '#f87171' }}>{formatStat(detail?.hp)}</span>
      </div>
    </div>
  );
};

export default CardArtwork;
