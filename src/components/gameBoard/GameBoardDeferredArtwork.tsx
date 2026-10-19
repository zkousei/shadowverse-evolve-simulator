import React, { useEffect, useRef, useState } from 'react';
import CardArtwork from '../CardArtwork';

type Props = React.ComponentProps<typeof CardArtwork> & {
  scrollRootRef: React.RefObject<HTMLDivElement | null>;
};

/** Defer only artwork, keeping card actions and layout available while scrolling. */
const GameBoardDeferredArtwork = ({ scrollRootRef, ...artwork }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (visible || !ref.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { root: scrollRootRef.current, rootMargin: '160px 0px' });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible, scrollRootRef]);

  return (
    <div ref={ref} aria-busy={!visible} style={{ width: '100%', aspectRatio: '5 / 7' }}>
      {visible ? <CardArtwork {...artwork} retryOnError decoding="async" /> : (
        <div aria-label={artwork.alt} style={{ width: '100%', height: '100%', borderRadius: '4px', background: 'var(--bg-surface-elevated)' }} />
      )}
    </div>
  );
};

export default GameBoardDeferredArtwork;
