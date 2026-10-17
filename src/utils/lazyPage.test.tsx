import { Component, Suspense, useState, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLazyPage } from './lazyPage';

class RenderFailureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <p role="alert">Unexpected page error</p> : this.props.children;
  }
}

describe('createLazyPage', () => {
  afterEach(() => vi.restoreAllMocks());

  it('defers loading until rendered and resolves a pending module', async () => {
    let resolve!: (page: { default: () => ReactNode }) => void;
    const pending = new Promise<{ default: () => ReactNode }>(done => { resolve = done; });
    const load = vi.fn(() => pending);
    const Page = createLazyPage(load);
    expect(load).not.toHaveBeenCalled();
    render(<Suspense fallback={<p role="status">Loading</p>}><Page /></Suspense>);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    await act(async () => { resolve({ default: () => <p>Loaded page</p> }); });
    expect(screen.getByText('Loaded page')).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('keeps loaded page state and does not import again on rerender', async () => {
    function StatefulPage() {
      const [count, setCount] = useState(0);
      return <button onClick={() => setCount(count + 1)}>Count {count}</button>;
    }
    const load = vi.fn(async () => ({ default: StatefulPage }));
    const Page = createLazyPage(load);
    const view = () => <Suspense fallback="Loading"><Page /></Suspense>;
    const { rerender } = render(view());
    fireEvent.click(await screen.findByRole('button', { name: 'Count 0' }));
    rerender(view());
    expect(screen.getByRole('button', { name: 'Count 1' })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('shows recovery UI for an import failure without retrying automatically', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const load = vi.fn().mockRejectedValue(new Error('Chunk unavailable'));
    const Page = createLazyPage(load);
    const view = () => <RenderFailureBoundary><Suspense fallback="Loading"><Page /></Suspense></RenderFailureBoundary>;
    const { unmount } = render(view());
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load this page');
    expect(screen.getByRole('button', { name: 'Reload this page' })).toBeInTheDocument();
    unmount();
    render(view());
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load this page');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not disguise runtime page errors as import failures', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function BrokenPage(): ReactNode { throw new Error('Runtime page error'); }
    const Page = createLazyPage(async () => ({ default: BrokenPage }));
    render(<RenderFailureBoundary><Suspense fallback="Loading"><Page /></Suspense></RenderFailureBoundary>);
    expect(await screen.findByRole('alert')).toHaveTextContent('Unexpected page error');
    expect(screen.queryByRole('button', { name: 'Reload this page' })).not.toBeInTheDocument();
  });
});
