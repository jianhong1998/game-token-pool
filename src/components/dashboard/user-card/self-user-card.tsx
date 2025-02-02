'use client';

import { IUserData } from '@/app/actions/user-data';
import DepositPopup from '@/components/forms/deposit-popup/deposit-popup';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import { NumberUtil } from '@/util/shared/number.util';
import { FC, useState } from 'react';

interface UserCardProps {
  userData: IUserData;
}

const SelfUserCard: FC<UserCardProps> = ({ userData }) => {
  const username = userData.user.name;

  const { displayString: balanceCashAmountString } =
    NumberUtil.getDisplayAmount(userData.token.currentAmount, {
      withComma: true,
    });
  const { displayString: totalDepositedCashAmountString } =
    NumberUtil.getDisplayAmount(userData.token.totalDepositedAmount, {
      withComma: true,
    });

  const [isDepositPopupOpen, setIsDepositPopupOpen] = useState<boolean>(false);

  const toggleDepositPopup = () => {
    setIsDepositPopupOpen((prev) => !prev);
  };

  return (
    <>
      <div className='card max-w-sm overflow-scroll shadow-lg bg-white z-0 rounded-3xl mx-auto'>
        <div className='card-body'>
          <div className='w-full'>
            <table className='w-full'>
              <tbody>
                <tr>
                  <td>Current User</td>
                  <td>
                    <h1 className='text-xl font-bold leading-tight text-right'>
                      {username}
                    </h1>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <hr className='border-t border-2 border-gray-200 w-full mx-auto my-4' />
          <div className='w-full'>
            <table className='w-full'>
              <tbody>
                <tr>
                  <td>Balance</td>
                  <td>
                    <p className='text-right font-mono'>
                      {balanceCashAmountString}
                    </p>
                  </td>
                </tr>
                <tr>
                  <td>Total Deposited</td>
                  <td>
                    <p className='text-right font-mono'>
                      {totalDepositedCashAmountString}
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <hr className='border-t border-2 border-gray-200 w-full mx-auto my-4' />
          <div className='box-content size-full'>
            <PrimaryButton
              buttonType='outlined'
              onClick={toggleDepositPopup}
            >
              Deposit
            </PrimaryButton>
          </div>
        </div>
      </div>
      <DepositPopup
        isOpen={isDepositPopupOpen}
        closeFn={toggleDepositPopup}
        username={username}
      />
    </>
  );
};

export default SelfUserCard;
