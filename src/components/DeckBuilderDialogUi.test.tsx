import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DeckBuilderDeckLogImportDialog from './DeckBuilderDeckLogImportDialog';
import DeckBuilderDeleteSavedDecksDialog from './DeckBuilderDeleteSavedDecksDialog';
import DeckBuilderDraftRestoreDialog from './DeckBuilderDraftRestoreDialog';
import DeckBuilderHoverPreview from './DeckBuilderHoverPreview';
import DeckBuilderPreviewModal from './DeckBuilderPreviewModal';
import DeckBuilderResetDialog from './DeckBuilderResetDialog';
import DeckBuilderSaveFeedback from './DeckBuilderSaveFeedback';
import DeckBuilderSavedDeckConfirmDialog from './DeckBuilderSavedDeckConfirmDialog';

import type { DeckBuilderCardData } from '../models/deckBuilderCard';
import type { CardDetail } from '../utils/cardDetails';

const sampleCardDetail: CardDetail = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  className: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  subtype: '兵士',
  cost: '1',
  atk: 2,
  hp: 2,
  abilityText: '[ファンファーレ] テスト能力。',
};

const sampleCard: DeckBuilderCardData = {
  id: 'BP01-001',
  name: 'Alpha Knight',
  image: '/alpha.png',
  cost: '1',
  class: 'ロイヤル',
  title: 'Hero Tale',
  type: 'フォロワー',
  subtype: '兵士',
  rarity: 'LG',
  product_name: 'Booster Pack 1',
  atk: '2',
  hp: '2',
  ability_text: '[ファンファーレ] テスト能力。',
  card_kind_normalized: 'follower',
  deck_section: 'main',
  is_token: false,
  is_evolve_card: false,
  is_deck_build_legal: true,
};

describe('DeckBuilder extracted UI components - dialogs', () => {
  it('renders DeckLog import dialog and enforces import availability', () => {
    const onDeckLogInputChange = vi.fn();
    const onCancel = vi.fn();
    const onImport = vi.fn();

    render(
      <DeckBuilderDeckLogImportDialog
        deckLogInput=""
        isImportingDeckLog={false}
        onDeckLogInputChange={onDeckLogInputChange}
        onCancel={onCancel}
        onImport={onImport}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('e.g. a DeckLog code or a public DeckLog URL'), {
      target: { value: 'ABC123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDeckLogInputChange).toHaveBeenCalledWith('ABC123');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  it('renders saved deck confirm dialogs for load and delete', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <DeckBuilderSavedDeckConfirmDialog
        kind="load"
        deckName="Alpha Deck"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Load saved deck confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Replace the current unsaved changes with "Alpha Deck"?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(
      <DeckBuilderSavedDeckConfirmDialog
        kind="delete"
        deckName="Alpha Deck"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Delete saved deck confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Delete "Alpha Deck" from My Decks on this browser?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders bulk delete dialog and wires actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <DeckBuilderDeleteSavedDecksDialog
        kind="selected"
        count={3}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Delete selected saved decks confirmation' })).toBeInTheDocument();
    expect(screen.getByText('Delete 3 selected saved decks from My Decks on this browser?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Delete Selected' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders draft restore dialog and wires both choices', () => {
    const onStartFresh = vi.fn();
    const onContinue = vi.fn();

    render(
      <DeckBuilderDraftRestoreDialog
        onStartFresh={onStartFresh}
        onContinue={onContinue}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Resume previous session' })).toBeInTheDocument();
    expect(screen.getByText('Restore the last Deck Builder session from this browser?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start Fresh' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(onStartFresh).toHaveBeenCalledTimes(1);
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('renders reset dialogs for deck and builder actions', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    const { rerender } = render(
      <DeckBuilderResetDialog
        kind="deck"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Reset deck confirmation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    rerender(
      <DeckBuilderResetDialog
        kind="builder"
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Reset builder confirmation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, Reset' }));

    expect(onConfirm).toHaveBeenCalledTimes(2);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders save feedback with correct live regions', () => {
    const { rerender } = render(
      <DeckBuilderSaveFeedback
        kind="success"
        message="Saved Alpha Deck."
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Saved Alpha Deck.');

    rerender(
      <DeckBuilderSaveFeedback
        kind="warning"
        message="Saving is disabled."
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Saving is disabled.');
  });

  it('renders the preview modal and wires overlay and close button actions', () => {
    const onClose = vi.fn();

    render(
      <DeckBuilderPreviewModal
        previewCard={sampleCard}
        previewDetail={sampleCardDetail}
        onClose={onClose}
      />
    );

    const dialog = screen.getByRole('dialog', { name: 'Alpha Knight preview' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('BP01-001')).toBeInTheDocument();
    expect(screen.getByText('[ファンファーレ] テスト能力。')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Close card preview' }));
    fireEvent.click(dialog.parentElement as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders hover preview content with the expected fixed position', () => {
    const { container } = render(
      <DeckBuilderHoverPreview
        hoveredDeckCard={sampleCard}
        hoveredDetail={sampleCardDetail}
        left={120}
        top={240}
        width={180}
        maxHeight={320}
      />
    );

    expect(screen.getByText('Alpha Knight')).toBeInTheDocument();
    const image = screen.getByAltText('Alpha Knight');
    expect(image).toBeInTheDocument();
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.left).toBe('120px');
    expect(wrapper.style.top).toBe('240px');
    expect(wrapper.style.width).toBe('180px');
    expect(wrapper.style.maxHeight).toBe('320px');
  });
});
