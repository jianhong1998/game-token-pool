'use client';

import { IUserData } from '@/app/actions/user-data';
import DangerButton from '@/components/ui/buttons/danger-button';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import { NumberUtil } from '@/util/shared/number.util';
import Link from 'next/link';
import { FC } from 'react';

interface UserCardProps {
  userData: IUserData;
  toggleDepositPopup: () => void;
  openEndGameConfirmationPopup: () => void;
}

const SelfUserCard: FC<UserCardProps> = ({
  userData,
  toggleDepositPopup,
  openEndGameConfirmationPopup,
}) => {
  const {
    user: { name: username },
    link: {
      userAccount: userAccountLink,
      userTokenAccount: userTokenAccountLink,
    },
  } = userData;

  const { displayString: balanceCashAmountString } =
    NumberUtil.getDisplayAmount(userData.token.currentAmount, {
      withComma: true,
    });
  const { displayString: totalDepositedCashAmountString } =
    NumberUtil.getDisplayAmount(userData.token.totalDepositedAmount, {
      withComma: true,
    });

  const { displayString: totalProfitString } = NumberUtil.getDisplayAmount(
    userData.token.currentAmount - userData.token.totalDepositedAmount,
    { withComma: true }
  );

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
                <tr>
                  <td>Net Profit</td>
                  <td>
                    <p className='text-right font-mono'>{totalProfitString}</p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className='w-full flex justify-center'>
            <div className='flex-1 text-left'>
              <Link
                href={userAccountLink}
                className='link link-primary'
                target='_blank'
              >
                User Account
              </Link>
            </div>
            <div className='flex-1 text-right'>
              <Link
                href={userTokenAccountLink}
                className='link link-primary'
                target='_blank'
              >
                Token Account
              </Link>
            </div>
          </div>
          <hr className='border-t border-2 border-gray-200 w-full mx-auto my-4' />
          <div className='flex flex-row gap-3 w-full'>
            <PrimaryButton
              buttonType='outlined'
              onClick={toggleDepositPopup}
              className='flex-1'
            >
              Deposit
            </PrimaryButton>
            <DangerButton
              buttonType='outlined'
              className='flex-1'
              onClick={openEndGameConfirmationPopup}
            >
              Delete Account
            </DangerButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default SelfUserCard;
