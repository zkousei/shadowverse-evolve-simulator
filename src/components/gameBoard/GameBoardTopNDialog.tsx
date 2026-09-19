import React from 'react';
import { useTranslation } from 'react-i18next';
import GameBoardCountDialog from './GameBoardCountDialog';

type GameBoardTopNDialogProps = {
  value: number;
  onValueChange: (value: number) => void;
  onCancel: () => void;
  onConfirm: (value: number) => void;
};

const GameBoardTopNDialog: React.FC<GameBoardTopNDialogProps> = ({
  value,
  onValueChange,
  onCancel,
  onConfirm,
}) => {
  const { t } = useTranslation();

  return (
    <GameBoardCountDialog
      value={value}
      title={t('gameBoard.modals.topN.title')}
      customLabel={t('gameBoard.modals.topN.custom')}
      customInputLabel={t('gameBoard.modals.topN.customInput')}
      confirmLabel={t('gameBoard.modals.topN.confirm')}
      onValueChange={onValueChange}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
};

export default GameBoardTopNDialog;
