import { IUserData } from '@/app/actions/user-data';
import { NumberUtil } from '@/util/shared/number.util';
import { FC } from 'react';

type OtherUserCardProps = {
  user: IUserData;
  onClickFn: (toUsername: string) => void;
};

const OtherUserCard: FC<OtherUserCardProps> = ({ user, onClickFn }) => {
  const username = user.user.name;
  const { displayString: displayAmount } = NumberUtil.getDisplayAmount(
    user.token.currentAmount,
    {
      withComma: true,
    }
  );

  const handleOpenTransferPopup = () => {
    onClickFn(user.user.name);
  };

  return (
    <div
      className='card max-w-sm overflow-scroll shadow-lg bg-white z-0 rounded-3xl min-h-max cursor-pointer'
      onClick={handleOpenTransferPopup}
    >
      <div className='card-body flex flex-row justify-between gap-3'>
        <h1 className='text-xl font-bold leading-tight flex-1 text-wrap'>
          {username}
        </h1>
        <h1 className='text-xl font-bold leading-tight flex-1 text-right font-mono'>
          {displayAmount}
        </h1>
      </div>
    </div>
  );
};

export default OtherUserCard;
