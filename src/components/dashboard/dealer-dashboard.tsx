'use client';

import { FC, useMemo, useState } from 'react';
import SelfUserCard from './user-card/self-user-card';
import { IUserData } from '@/app/actions/user-data';
import DepositPopup from '../forms/deposit-popup/deposit-popup';
import Divider from '../ui/divider';
import PrimaryButton from '../ui/buttons/primary-button';
import AddUserPopup from '../forms/add-user-popup/add-user-popup';
import { useUsername } from '../custom-hooks/use-user';
import { useGetAllUsers } from '../queries/user/user-data-queries';
import OtherUserList from './user-card/other-user-list';
import TransferPopup from '../forms/transfer-popup/transfer-popup';
import { NumberUtil } from '@/util/shared/number.util';
import {
  useMultiTransfer,
  useTransfer,
} from '../queries/user/user-transfer-queries';
import { useCommonMessagePopup } from '../popup/message-popup';
import MultiTransferPopup, {
  IMultiTransferData,
} from '../forms/transfer-popup/multi-transfer-popup';
import MultiTransferSummaryTable from '../tables/multi-transfer-summary-table';

interface DealerDashboardProps {
  userData: IUserData;
}

const DealerDashboard: FC<DealerDashboardProps> = ({ userData }) => {
  const [isDepositPopupOpen, setIsDepositPopupOpen] = useState<boolean>(false);
  const [isMultiTransferPopupOpen, setIsMultiTransferPopupOpen] =
    useState<boolean>(false);
  const [isAddUserPopupOpen, setIsAddUserPopupOpen] = useState<boolean>(false);
  const [isTransferPopupOpen, setIsTransferPopupOpen] =
    useState<boolean>(false);

  const [currentPlayerNames, setCurrentPlayerNames] = useState<string[]>([]);
  const [toUsername, setToUsername] = useState<string>('');

  const username = useUsername();
  const { data: users } = useGetAllUsers();

  const currentPlayerDataArray = useMemo(() => {
    if (!users) return [];
    const currrentPlayerNameSet = new Set(currentPlayerNames);
    return users.filter((user) => currrentPlayerNameSet.has(user.user.name));
  }, [users, currentPlayerNames]);

  const { mutateAsync: transferToUserFn, isPending: isTransferToUserPending } =
    useTransfer(username);
  const { mutateAsync: multiTransferFn, isPending: isMultiTranferPending } =
    useMultiTransfer(username);

  const {
    openPopup: openCommonMessagePopupFn,
    popupComponent: commonMessagePopupComponent,
  } = useCommonMessagePopup();

  const toggleDepositPopup = () => {
    setIsDepositPopupOpen((prev) => !prev);
  };
  const toggleTransferMultiplePopup = () => {
    setIsMultiTransferPopupOpen((prev) => !prev);
  };
  const toggleAddUserPopup = () => {
    setIsAddUserPopupOpen((prev) => !prev);
  };
  const toggleTransferPopup = () => {
    setIsTransferPopupOpen((prev) => !prev);
  };

  const handleOpenTransferPopup = (username: string) => {
    setToUsername(username);
    setIsTransferPopupOpen(true);
  };
  const handleTransfer = async (cashAmount: number) => {
    await transferToUserFn({
      toUsername,
      cashAmount,
    });
  };

  const handleUserChange = (usernames: string[]) => {
    setCurrentPlayerNames(usernames);
  };

  const handleMultiTransfer = async (multiTransferData: IMultiTransferData) => {
    // TODO:
    await multiTransferFn(multiTransferData);
    openCommonMessagePopupFn(
      <MultiTransferSummaryTable multiTransferData={multiTransferData} />,
      'Successfully Transfer to Multi-Users'
    );
  };

  return (
    <>
      <SelfUserCard
        userData={userData}
        toggleDepositPopup={toggleDepositPopup}
        isInDealerMode
        toggleTransferMultiplePopup={toggleTransferMultiplePopup}
      />
      <Divider />
      <div className='flex flex-row mb-3'>
        <PrimaryButton
          className='flex-1'
          onClick={toggleAddUserPopup}
        >
          Add User
        </PrimaryButton>
      </div>
      <div className='flex flex-col gap-2'>
        <OtherUserList
          users={currentPlayerDataArray}
          cardOnClickFn={handleOpenTransferPopup}
        />
      </div>

      {/* Popups */}
      <DepositPopup
        closeFn={toggleDepositPopup}
        isOpen={isDepositPopupOpen}
        username={userData.user.name}
      />
      <AddUserPopup
        isOpen={isAddUserPopupOpen}
        closePopupFn={toggleAddUserPopup}
        currentPlayerNames={currentPlayerNames}
        selfUsername={username}
        users={users}
        userChangeFn={handleUserChange}
      />
      <TransferPopup
        isPopupOpen={isTransferPopupOpen}
        closePopupFn={toggleTransferPopup}
        isTransfering={isTransferToUserPending}
        maxTransferAmount={
          NumberUtil.getCashAmount(userData.token.currentAmount).value
        }
        toUsername={toUsername}
        transferFn={handleTransfer}
        onSuccess={openCommonMessagePopupFn}
      />
      <MultiTransferPopup
        isOpen={isMultiTransferPopupOpen}
        closePopupFn={toggleTransferMultiplePopup}
        currentPlayers={currentPlayerNames}
        transferFn={handleMultiTransfer}
        maxAmount={NumberUtil.getCashAmount(userData.token.currentAmount).value}
        disable={isMultiTranferPending || isTransferToUserPending}
      />
      {commonMessagePopupComponent}
    </>
  );
};

export default DealerDashboard;
