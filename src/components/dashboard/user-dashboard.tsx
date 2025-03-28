'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGetAllUsers, useGetUser } from '../queries/user/user-data-queries';
import { ErrorCode } from '@/constants/error';
import SelfUserCard from './user-card/self-user-card';
import { ErrorUtil } from '@/util/shared/error.util';
import { NotificationUtil } from '@/util/client/notification.util';
import OtherUserList from './user-card/other-user-list';
import TransferPopup from '../forms/transfer-popup/transfer-popup';
import { useTransfer } from '../queries/user/user-transfer-queries';
import DepositPopup from '../forms/deposit-popup/deposit-popup';
import EndGamePopup from '../forms/end-game-popup/end-game-popup';
import Divider from '../ui/divider';
import { useLocalStorage } from '../custom-hooks/use-local-storage';
import { LocalStorageKey } from '@/enums/local-storage-key.enum';
import { useCommonMessagePopup } from '../popup/message-popup';

type UserDashboardProps = {
  username: string;
};

const UserDashboard: FC<UserDashboardProps> = ({ username }) => {
  const router = useRouter();
  const transferFrom = useRef<string>(username);
  const transferTo = useRef<string>('');

  const [isTransferPopupOpen, setIsTransferPopupOpen] =
    useState<boolean>(false);
  const [isDepositPopupOpen, setIsDepositPopupOpen] = useState<boolean>(false);
  const [isEndGamePopupOpen, setIsEndGamePopupOpen] = useState<boolean>(false);

  const { removeValue: removeUsername } = useLocalStorage(
    LocalStorageKey.USER,
    ''
  );
  const { removeValue: removeUserPublicKey } = useLocalStorage(
    LocalStorageKey.USER_PUBLIC_KEY,
    ''
  );
  const {
    openPopup: openCommonMessagePopup,
    popupComponent: commonMessagePopupComponent,
  } = useCommonMessagePopup();

  const openTransferPopup = (toUsername: string) => {
    transferTo.current = toUsername;

    setIsTransferPopupOpen(true);
  };

  const closeTransferPopup = () => {
    setIsTransferPopupOpen(false);
  };

  const toggleDepositPopup = () => {
    setIsDepositPopupOpen((prev) => !prev);
  };

  const toggleEndGameConfirmationPopup = () => {
    setIsEndGamePopupOpen((prev) => !prev);
  };

  const { data: userData, error: getUserError } = useGetUser(username);
  const { data: allUsersData, error: getAllUsersError } = useGetAllUsers();
  const { mutateAsync: transferFn, isPending: isTransferPending } = useTransfer(
    transferFrom.current
  );

  const transferHandler = async (transferCashAmount: number) => {
    await transferFn({
      toUsername: transferTo.current,
      cashAmount: transferCashAmount,
    });
  };

  const handleLogout = () => {
    removeUsername();
    removeUserPublicKey();
    router.replace('/');
  };

  // Handle get user error
  useEffect(() => {
    if (!getUserError) return;

    if (ErrorUtil.isUserNotFoundError(getUserError.message)) {
      NotificationUtil.error('User is not found');
      removeUsername();
      removeUserPublicKey();
      router.replace('/');
      return;
    }

    NotificationUtil.error(ErrorCode.SOMETHING_WENT_WRONG);
    console.log(getUserError.message);
  }, [getUserError, router, removeUsername, removeUserPublicKey]);

  // Handle get all users error
  useEffect(() => {
    if (!getAllUsersError) return;

    const errorMessage = getAllUsersError.message;

    NotificationUtil.error(errorMessage);
  }, [getAllUsersError]);

  if (!userData || !allUsersData) {
    return (
      <div className='h-100 flex flex-row items-center'>
        <h1 className='text-center flex-1 font-bold text-xl'>
          Loading user data...
        </h1>
      </div>
    );
  }

  return (
    <>
      <SelfUserCard
        userData={userData}
        toggleDepositPopup={toggleDepositPopup}
        openEndGameConfirmationPopup={toggleEndGameConfirmationPopup}
        logOutOnClickFn={handleLogout}
      />
      <Divider />
      <div className='mb-3'>
        <p className='text-center'>Click on user to transfer token</p>
      </div>
      <OtherUserList
        users={allUsersData.filter(
          (user) => user.user.publicKey !== userData.user.publicKey
        )}
        cardOnClickFn={openTransferPopup}
      />
      <TransferPopup
        isPopupOpen={isTransferPopupOpen}
        closePopupFn={closeTransferPopup}
        toUsername={transferTo.current}
        isTransfering={isTransferPending}
        maxTransferAmount={userData.token.currentAmount / 100}
        transferFn={transferHandler}
        onSuccess={openCommonMessagePopup}
      />
      <DepositPopup
        isOpen={isDepositPopupOpen}
        closeFn={toggleDepositPopup}
        username={username}
      />
      <EndGamePopup
        isPopupOpen={isEndGamePopupOpen}
        togglePopupFn={toggleEndGameConfirmationPopup}
        username={username}
      />
      {commonMessagePopupComponent}
    </>
  );
};

export default UserDashboard;
