import PrimaryButton from '@/components/ui/buttons/primary-button';
import AmountInput from '@/components/ui/inputs/amount-input';
import { NumberUtil } from '@/util/shared/number.util';
import { FC, KeyboardEventHandler, ReactNode, useState } from 'react';

interface TransferMessageProps {
  displayedAmount: string;
  username: string;
}

const TransferMessage: FC<TransferMessageProps> = ({
  displayedAmount,
  username,
}) => {
  return (
    <p className='text-center'>
      Transfered <span className='font-bold'>{displayedAmount}</span> to{' '}
      <span className='font-bold'>{username}</span>.
    </p>
  );
};

interface TransferPopupProps {
  isPopupOpen: boolean;
  closePopupFn: () => void;
  toUsername: string;
  maxTransferAmount: number;
  transferFn: (cashAmount: number) => Promise<void>;
  isTransfering: boolean;
  onSuccess?: (message: string | ReactNode, title?: string) => void;
}

const TransferPopup: FC<TransferPopupProps> = ({
  closePopupFn,
  isPopupOpen,
  toUsername,
  maxTransferAmount,
  transferFn,
  isTransfering,
  onSuccess,
}) => {
  const [cashAmount, setCashAmount] = useState<number>(0);

  const handleClosePopup = () => {
    setCashAmount(0);
    closePopupFn();
  };

  const handleTansfer = async () => {
    await transferFn(cashAmount);
    handleClosePopup();

    if (onSuccess) {
      const displayedAmount = NumberUtil.getCashAmount(
        cashAmount * 100
      ).displayString;

      onSuccess(
        <TransferMessage
          displayedAmount={displayedAmount}
          username={toUsername}
        />,
        `Transfer Successfully`
      );
    }
  };

  const handleKeyUp: KeyboardEventHandler<HTMLInputElement> = (e) => {
    const key = e.key.toLowerCase();

    if (key === 'enter') {
      handleTansfer();
      return;
    }
  };

  if (!isPopupOpen) return <></>;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
        <div>
          <h2 className='text-2xl font-bold mb-4 text-primary text-center'>
            Transfer to {toUsername}
          </h2>
          <AmountInput
            amount={cashAmount}
            setAmount={setCashAmount}
            maxNumber={maxTransferAmount}
            keyUpHandler={handleKeyUp}
            disabled={isTransfering}
          />
        </div>
        <div className='flex flex-row gap-3 w-full justify-between'>
          <PrimaryButton
            buttonType='contained'
            className='flex-1'
            disabled={isTransfering || cashAmount === 0}
            onClick={handleTansfer}
          >
            Transfer
          </PrimaryButton>
          <PrimaryButton
            buttonType='outlined'
            className='flex-1'
            onClick={handleClosePopup}
            disabled={isTransfering}
          >
            Close
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};
export default TransferPopup;
