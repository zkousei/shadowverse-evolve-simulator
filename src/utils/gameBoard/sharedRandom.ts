export const flipSharedCoin = (
  random: () => number = Math.random
): 'HEADS (表)' | 'TAILS (裏)' => {
  return random() > 0.5 ? 'HEADS (表)' : 'TAILS (裏)';
};

export const rollSharedDie = (
  random: () => number = Math.random
): number => {
  return Math.floor(random() * 6) + 1;
};
