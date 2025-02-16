import { IUserData } from '@/app/actions/user-data';
import CommonPopup, { CommonPopupProps } from '@/components/popup/common-popup';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import Header from '@/components/ui/typography/header';
import { ChangeEventHandler, FC, useMemo, useState } from 'react';
import AddUserForm from './add-user-form';

interface AddUserPopupProps extends CommonPopupProps {
  currentPlayerNames: string[];
  selfUsername: string;
  users: IUserData[] | undefined;
  userChangeFn: (usernames: string[]) => void;
}

const AddUserPopup: FC<AddUserPopupProps> = ({
  closePopupFn,
  isOpen,
  currentPlayerNames,
  selfUsername,
  users,
  userChangeFn,
}) => {
  const [selectedUsers, setSelectedUsers] =
    useState<string[]>(currentPlayerNames);

  const usernames =
    users
      ?.map((user) => user.user.name)
      .filter((username) => username !== selfUsername) ?? [];

  const handleClosePopup = () => {
    closePopupFn();
    setSelectedUsers(currentPlayerNames);
  };

  const handleSelectUserChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const username = e.target.value;
    const isChecked = e.target.checked;

    if (isChecked) {
      setSelectedUsers((prev) => [...prev, username]);
      return;
    }

    setSelectedUsers((prev) => {
      const newArr = prev.filter(
        (selectedUsername) => selectedUsername !== username
      );

      return newArr;
    });
  };

  const handleSelectAll = () => {
    setSelectedUsers(usernames);
  };

  const handleSubmit = () => {
    userChangeFn(selectedUsers);
    closePopupFn();
  };

  return (
    <CommonPopup isOpen={isOpen}>
      <Header>Add Users</Header>

      <div className='overflow-y-scroll'>
        <AddUserForm
          users={usernames}
          selectUserFn={handleSelectUserChange}
          selectedUsers={selectedUsers}
          handleSelectAllFn={handleSelectAll}
          currentPlayers={currentPlayerNames}
        />
      </div>

      {/* Action Buttons */}
      <div className='flex flex-row gap-3 w-full justify-between'>
        <PrimaryButton
          buttonType='contained'
          className='flex-1'
          onClick={handleSubmit}
        >
          Add Users
        </PrimaryButton>
        <PrimaryButton
          buttonType='outlined'
          onClick={handleClosePopup}
          className='flex-1'
        >
          Close
        </PrimaryButton>
      </div>
    </CommonPopup>
  );
};

export default AddUserPopup;
