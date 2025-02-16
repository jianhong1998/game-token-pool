import { IGetGameDetailsResponse } from '@/app/game/actions/fetch-games';
import Divider from '@/components/ui/divider';
import { NumberUtil } from '@/util/shared/number.util';
import Link from 'next/link';
import { FC } from 'react';

interface GameDetailCardProps {
  gameDetails: IGetGameDetailsResponse;
}

const GameDetailCard: FC<GameDetailCardProps> = ({ gameDetails }) => {
  const { displayString: displayedBalance } = NumberUtil.getCashAmount(
    gameDetails.totalToken
  );
  const {
    urls: { gameTokenAccount: gameTokenAccountExplorerUrl },
  } = gameDetails;

  return (
    <div className='card bg-white z-0 rounded-3xl mx-auto'>
      <div className='card-body'>
        <div className='flex flex-row justify-between'>
          <h1 className='text-lg font-bold'>{gameDetails.name}</h1>
          <Link
            href={gameTokenAccountExplorerUrl}
            className='link link-primary'
            target='_blank'
          >
            View Game Token Account
          </Link>
        </div>
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
