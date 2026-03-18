export type RestrictionFormat = 'constructed' | 'crossover';
export type PolicyRestrictionStatus = 'limited' | 'banned';
export type RestrictionSource = 'default' | 'intrinsic' | 'policy-limited' | 'policy-banned';

export type PolicyRestriction = {
  format: RestrictionFormat;
  key: string;
  status: PolicyRestrictionStatus;
  reason: string;
};

export type EffectiveDeckRestriction = {
  copyLimit: number;
  source: RestrictionSource;
  reason?: string;
  format?: RestrictionFormat;
};
