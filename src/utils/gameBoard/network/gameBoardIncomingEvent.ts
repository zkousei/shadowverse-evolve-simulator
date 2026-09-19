type IgnoreIncomingEventDecision = {
  type: 'ignore';
};

type ApplyIncomingEventDecision = {
  type: 'apply';
  source: 'guest';
};

export type IncomingEventDecision =
  | IgnoreIncomingEventDecision
  | ApplyIncomingEventDecision;

export const getIncomingEventDecision = ({
  isHost,
}: {
  isHost: boolean;
}): IncomingEventDecision => {
  if (!isHost) {
    return { type: 'ignore' };
  }

  return {
    type: 'apply',
    source: 'guest',
  };
};
