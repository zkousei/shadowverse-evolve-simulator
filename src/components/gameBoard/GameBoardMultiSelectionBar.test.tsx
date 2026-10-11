import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GameBoardMultiSelectionBar from './GameBoardMultiSelectionBar';
import type { BoardBatchAction } from '../../utils/gameBoard/gameBoardMultiSelection';
const props = () => ({ active: true, canStart: true, count: 2, onStart: vi.fn(), onClear: vi.fn(), onFinish: vi.fn(), onRun: vi.fn(), canRun: (action: BoardBatchAction) => action !== 'atk+', });
describe('multi selection bar', () => {
  it('shows count, exposes direct actions and explains unavailable operations', () => {
    const args = props();
    render(<GameBoardMultiSelectionBar {...args} />);
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Attack +1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Attack +1' })).toHaveAttribute('title', 'Select cards that all support this operation.');
    fireEvent.click(screen.getByRole('button', { name: 'Health -1' }));
    expect(args.onRun).toHaveBeenCalledWith('hp-');
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));
    expect(args.onClear).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Exit selection' }));
    expect(args.onFinish).toHaveBeenCalledOnce();
  });
  it('offers a selection entry only when available', () => {
    const args = props();
    const { rerender } = render(<GameBoardMultiSelectionBar {...args} active={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Select multiple' }));
    expect(args.onStart).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Health -1' })).not.toBeInTheDocument();
    rerender(<GameBoardMultiSelectionBar {...args} active={false} canStart={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

it('keeps instructions collapsed until help is opened', () => {
  render(<GameBoardMultiSelectionBar {...props()} />);
  const help = screen.getByRole('button', { name: 'Selection help' });
  expect(help).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Select or deselect cards in both players’ Field / EX. Press Escape to exit.')).not.toBeInTheDocument();
  fireEvent.click(help);
  expect(help).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByTestId('multi-selection-help')).toBeVisible();
});
