'use client';

import { useDeposit } from '@/components/queries/user/user-deposit-queries';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import AmountInput from '@/components/ui/inputs/amount-input';
import { MAX_DEPOSIT_AMOUNT } from '@/constants';
import { FC, KeyboardEventHandler, useCallback, useState } from 'react';

type DepositPopupProps = {
  isOpen: boolean;
  closeFn: () => void;
  username: string;
};

const DepositPopup: FC<DepositPopupProps> = ({ isOpen, closeFn, username }) => {
  const [cashAmount, setCashAmount] = useState<number>(0);

  const { mutateAsync: depositFn, isPending: isDepositPending } = useDeposit();

  const handleClosePopup = useCallback(() => {
    setCashAmount(0);
    closeFn();
  }, [closeFn]);

  const handleDeposit = async () => {
    if (cashAmount <= 0) return;

    await depositFn({
      username,
      cashAmount,
    });

    handleClosePopup();
  };

  const handleKeyUp: KeyboardEventHandler<HTMLInputElement> = (e) => {
    const key = e.key.toLowerCase();
    if (key === 'enter') {
      handleDeposit();
      return;
    }
  };

  if (!isOpen) return <></>;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
        <div>
          <h2 className='text-2xl font-bold mb-4 text-primary text-center'>
            Deposit to {username}
          </h2>
          <AmountInput
            amount={cashAmount}
            setAmount={setCashAmount}
            keyUpHandler={handleKeyUp}
            maxNumber={MAX_DEPOSIT_AMOUNT}
            disabled={isDepositPending}
          />
        </div>
        <div className='flex flex-row gap-3 w-full justify-between'>
          <PrimaryButton
            buttonType='contained'
            className='flex-1'
            disabled={cashAmount <= 0 || isDepositPending}
            onClick={handleDeposit}
          >
            Deposit
          </PrimaryButton>
          <PrimaryButton
            buttonType='outlined'
            className='flex-1'
            onClick={handleClosePopup}
            disabled={isDepositPending}
          >
            Close
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default DepositPopup;
