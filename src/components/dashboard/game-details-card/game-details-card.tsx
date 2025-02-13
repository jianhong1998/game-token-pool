import { IGetGameDetailsResponse } from '@/app/game/actions/fetch-games';
import Divider from '@/components/ui/divider';
import { NumberUtil } from '@/util/shared/number.util';
import { FC } from 'react';

interface GameDetailCardProps {
  gameDetails: IGetGameDetailsResponse;
}

const GameDetailCard: FC<GameDetailCardProps> = ({ gameDetails }) => {
  const { displayString: displayedBalance } = NumberUtil.getDisplayAmount(
    gameDetails.totalToken
  );

  return (
    <div className='card bg-white z-0 rounded-3xl mx-auto'>
      <div className='card-body'>
        <h1 className='text-lg font-bold'>{gameDetails.name}</h1>
        <Divider />
        <div className='flex flex-row'>
          <p>Game Balance</p>
          <p className='text-right font-mono'>{displayedBalance}</p>
        </div>
      </div>
    </div>
  );
};

export default GameDetailCard;
