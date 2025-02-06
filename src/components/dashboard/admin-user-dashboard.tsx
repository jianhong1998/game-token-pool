import { FC, useState } from 'react';
import { useGetAllUsers } from '../queries/user/user-data-queries';
import OtherUserList from './user-card/other-user-list';
import { NotificationUtil } from '@/util/client/notification.util';
import AdminEndGamePopup from '../forms/end-game-popup/admin-end-game-popup';

const AdminUserDashboard: FC = () => {
  const [isRemoveUserPopupOpen, setIsRemoveUserPopupOpen] =
    useState<boolean>(false);
  const [selectedUsername, setSelectedUsername] = useState<string>('');

  const {
    data: users,
    isLoading: isFetchingUsers,
    error: fetchUsersError,
  } = useGetAllUsers();

  const openUserEndGamePopup = (username: string) => {
    setSelectedUsername(username);
    setIsRemoveUserPopupOpen(true);
  };

  const closeUserEndGamePopup = () => {
    setIsRemoveUserPopupOpen(false);
  };

  if (fetchUsersError) {
    NotificationUtil.error('Failed to fetch users!');
  }

  if (isFetchingUsers) {
    return <h1 className='font-bold text-2xl text-center'>Loading Users...</h1>;
  }

  if (!users) {
    return (
      <h1 className='font-bold text-2xl text-center text-error'>
        Failed to fetch users! Please refresh the page!
      </h1>
    );
  }

  if (users.length === 0) {
    return (
      <h1 className='font-bold text-2xl text-center'>
        No user account for the pool
      </h1>
    );
  }

  return (
    <>
      <OtherUserList
        cardOnClickFn={openUserEndGamePopup}
        users={users}
      />
      <AdminEndGamePopup
        togglePopupFn={closeUserEndGamePopup}
        isPopupOpen={isRemoveUserPopupOpen}
        username={selectedUsername}
      />
    </>
  );
};

export default AdminUserDashboard;
