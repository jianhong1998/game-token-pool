import { IUserData } from '@/app/actions/user-data';
import { FC } from 'react';
import OtherUserCard from './other-user-card';

type OtherUserListProps = {
  users: IUserData[];
  openTransferPopupFn: (toUsername: string) => void;
};

const OtherUserList: FC<OtherUserListProps> = ({
  users,
  openTransferPopupFn,
}) => {
  return (
    <div className='gap-3 overflow-y-scroll max-h-80 flex flex-col sm:grid sm:grid-cols-2 sm:max-h-72'>
      {users
        .sort(
          (user1, user2) =>
            user2.token.currentAmount - user1.token.currentAmount
        )
        .map((user) => (
          <OtherUserCard
            user={user}
            key={user.user.publicKey}
            openTransferPopupFn={openTransferPopupFn}
          />
        ))}
    </div>
  );
};

export default OtherUserList;
