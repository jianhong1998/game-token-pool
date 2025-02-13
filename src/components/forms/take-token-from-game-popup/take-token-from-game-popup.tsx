import PrimaryButton from '@/components/ui/buttons/primary-button';
import AmountInput from '@/components/ui/inputs/amount-input';
import { FC, KeyboardEventHandler, useState } from 'react';

type TakeTokenFromGamePopupProps = {
  isPopupOpen: boolean;
  closePopupFn: () => void;
  isActionProcessing: boolean;
  processFn: (cashAmount: number) => Promise<void>;
  maxTransferAmount: number;
  gameName: string;
};

const TakeTokenFromGamePopup: FC<TakeTokenFromGamePopupProps> = ({
  closePopupFn,
  isActionProcessing,
  isPopupOpen,
  processFn,
  maxTransferAmount,
  gameName,
}) => {
  const [cashAmount, setCashAmount] = useState<number>(0);

  const handleClosePopup = () => {
    setCashAmount(0);
    closePopupFn();
  };

  const handleTansfer = async () => {
    await processFn(cashAmount);
    handleClosePopup();
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
            Take Token From {gameName}
          </h2>
          <div className='flex flex-row gap-2'>
            <AmountInput
              amount={cashAmount}
              setAmount={setCashAmount}
              maxNumber={maxTransferAmount}
              keyUpHandler={handleKeyUp}
              disabled={isActionProcessing}
            />
            <PrimaryButton
              disabled={isActionProcessing}
              onClick={() => setCashAmount(maxTransferAmount)}
              buttonType='outlined'
            >
              Max
            </PrimaryButton>
          </div>
        </div>
        <div className='flex flex-row gap-3 w-full justify-between'>
          <PrimaryButton
            buttonType='contained'
            className='flex-1'
            disabled={isActionProcessing || cashAmount === 0}
            onClick={handleTansfer}
          >
            Take
          </PrimaryButton>
          <PrimaryButton
            buttonType='outlined'
            className='flex-1'
            onClick={handleClosePopup}
            disabled={isActionProcessing}
          >
            Close
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default TakeTokenFromGamePopup;
