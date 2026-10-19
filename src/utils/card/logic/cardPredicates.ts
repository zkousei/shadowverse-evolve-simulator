import type { CardInstance } from '../../../components/Card';

export const getZonePrefix = (zone: string): string => zone.split('-')[0];

export const PRIVATE_ZONE_PREFIXES = new Set(['mainDeck', 'evolveDeck', 'hand', 'cemetery', 'banish']);
export const ATTACHMENT_BLOCKED_ZONE_PREFIXES = new Set([...PRIVATE_ZONE_PREFIXES, 'ex']);

export const isLeaderZone = (zone: string): boolean => zone.startsWith('leader-');

export const isLeaderCard = (card: CardInstance | undefined): boolean =>
  Boolean(card?.isLeaderCard) || isLeaderZone(card?.zone ?? '');

export const isTokenCard = (card: CardInstance | undefined): boolean =>
  Boolean(card?.isTokenCard) || card?.cardId === 'token';

export const isFieldZone = (zone: string): boolean => getZonePrefix(zone) === 'field';
