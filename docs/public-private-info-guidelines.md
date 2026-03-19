# Public / Private Information Guidelines

This document describes how the current app treats public and private information when implementing UI, notifications, and logs.

It is not a full Shadowverse Evolve rules document. It is a practical guide for keeping the current implementation consistent and avoiding accidental information leaks.

## Core Principle

- Show card names only when the information is already public to the opponent.
- If the information is private, prefer showing only:
  - that an action happened
  - or how many cards were involved
- If there is any doubt, prefer the non-revealing version.
- If a card is explicitly revealed by the action itself, it can be treated as public for that action.

## Zone Classification

### Public zones

- `field-*`
- `ex-*`
- `cemetery-*`
- `banish-*`
- `leader-*`

Cards in these zones are treated as public information unless a special temporary rule says otherwise.

### Private or semi-private zones

- `hand-*`
- `mainDeck-*`
- `evolveDeck-*`

These zones need extra care.

## Zone-by-Zone Rules

### Field

- Normally public.
- Card names may be shown in notifications.
- Exception:
  - During `preparing`, `mainDeck -> field` may be used for starter amulet support.
  - In that case the card may be set face-down.
  - Because of that, notifications for `mainDeck -> field` during preparation should stay generic.

### EX Area

- Treated as public.
- Card names may be shown in notifications.

### Cemetery

- Public.
- Card names may be shown in notifications.
- Moving a card from cemetery to another zone may also show the card name, because the source card is already public.

### Banish

- Public.
- Card names may be shown in notifications.

### Hand

- Private in P2P.
- Public only to the owning player.
- Exceptions:
  - If a card is explicitly revealed before entering hand, that revealed card may be shown.
  - If a card is added to hand from a public zone like cemetery, the source card name may still be shown.

### Main Deck

- Private.
- Card names should not be shown directly.
- If a card is taken from the deck and then explicitly revealed, it becomes public for that action.

### Evolve Deck

- Treated as semi-private.
- Face-down cards should be treated as private.
- Used face-up cards may be treated as public.

### Leader

- Public.
- Card names may be shown.

## Action Rules

### Play / Play to Field

- Cards used via visible `Play` / `Play to Field` buttons are treated as public for that action.
- Card name notifications are allowed.
- Exception:
  - `mainDeck -> field` during preparation remains generic because of starter amulet face-down placement.

### Search -> Hand

#### Main Deck -> Hand

- Non-revealed:
  - Do not show the card name.
  - Example: `You added a card from Search to hand`
- Revealed:
  - Show the card name.

#### Cemetery -> Hand

- Show the card name.
- The source card is already public.

### Search -> Field / EX

#### Main Deck -> Field

- `preparing`:
  - Keep notification generic.
  - This protects starter amulet face-down placement.
- `playing`:
  - Card name may be shown.

#### Main Deck -> EX

- Card name may be shown.

#### Cemetery -> Field / EX

- Card name may be shown.

### Look Top N

The acting player sees all selected cards, but the opponent should only receive public parts.

#### Public parts

- Cards explicitly revealed to hand
- Cards moved to `field`
- Cards moved to `ex`
- Cards moved to `cemetery`

#### Non-public parts

- Cards returned to `top`
- Cards returned to `bottom`
- Cards added to hand without reveal

#### Notification rule

- Revealed-to-hand cards:
  - show card names
- Field / EX / Cemetery results:
  - show card names
- Top / Bottom / non-revealed Hand:
  - show counts only

### Mill

- The milled card becomes public in cemetery.
- Card name may be shown.

### Shuffle

- The deck contents stay private.
- Only show that shuffling happened.

## Solo vs P2P

### Solo

- In practice, the player can see both sides.
- Even so, new notifications should still be designed using the P2P privacy model when possible.

### P2P

- This should be treated as the source of truth for privacy decisions.
- If a notification is safe in P2P, it is safe in solo.

## Current Important Exceptions

### Starter amulet support

- `mainDeck -> field` during `preparing` may place a card face-down.
- Because of that, field placement from search during preparation should not reveal card names.

### Look Top logging

- For `Look Top`, revealed hand cards are best represented inside the summary entry rather than as a separate recent-event line.
- This avoids making the revealed card look like an older, less important event than the summary itself.

## Recommended Decision Order

When adding a new UI message, dialog, or recent-event entry, check in this order:

1. Is the source zone public or private?
2. Is the destination zone public or private?
3. Does the action explicitly reveal the card?
4. Does the opponent need:
   - the card name
   - only the fact that something happened
   - or only a count?

If the answer is unclear, prefer the less revealing option.
