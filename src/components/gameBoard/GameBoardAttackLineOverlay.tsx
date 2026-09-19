import React from 'react';

type Point = {
  x: number;
  y: number;
};

type GameBoardAttackLineOverlayProps = {
  sourcePoint: Point;
  targetPoint: Point;
};

const GameBoardAttackLineOverlay: React.FC<GameBoardAttackLineOverlayProps> = ({
  sourcePoint,
  targetPoint,
}) => (
  <svg
    width="100vw"
    height="100vh"
    viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
    style={{
      position: 'fixed',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 1940,
      overflow: 'visible',
    }}
  >
    <defs>
      <marker
        id="attack-arrowhead"
        markerWidth="12"
        markerHeight="12"
        refX="10"
        refY="6"
        orient="auto"
      >
        <path d="M0,0 L12,6 L0,12 z" fill="#fb923c" />
      </marker>
    </defs>
    <line
      x1={sourcePoint.x}
      y1={sourcePoint.y}
      x2={targetPoint.x}
      y2={targetPoint.y}
      stroke="#fdba74"
      strokeWidth="4"
      strokeLinecap="round"
      markerEnd="url(#attack-arrowhead)"
      style={{
        filter: 'drop-shadow(0 0 10px rgba(249,115,22,0.55))',
      }}
    />
  </svg>
);

export default GameBoardAttackLineOverlay;
