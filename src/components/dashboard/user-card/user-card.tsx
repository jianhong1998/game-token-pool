import { IUserData } from '@/app/actions/user-data';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import { NumberUtil } from '@/util/shared/number.util';
import { FC } from 'react';

interface UserCardProps {
  userData: IUserData;
}

const UserCard: FC<UserCardProps> = ({ userData }) => {
  const username = userData.user.name;

  const { displayString: balanceCashAmountString } =
    NumberUtil.getDisplayAmount(userData.token.currentAmount);
  const { displayString: totalDepositedCashAmountString } =
    NumberUtil.getDisplayAmount(userData.token.totalDepositedAmount);

  return (
    <div className='card max-w-sm rounded overflow-scroll shadow-lg bg-white z-0'>
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
                  <p className='text-right'>{balanceCashAmountString}</p>
                </td>
              </tr>
              <tr>
                <td>Total Deposited</td>
                <td>
                  <p className='text-right'>{totalDepositedCashAmountString}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <hr className='border-t border-2 border-gray-200 w-full mx-auto my-4' />
        <div className='box-content size-full'>
          <PrimaryButton type='outlined'>Deposit</PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export default UserCard;
