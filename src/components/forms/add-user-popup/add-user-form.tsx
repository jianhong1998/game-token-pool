import PrimaryButton from '@/components/ui/buttons/primary-button';
import { ChangeEventHandler, FC, useMemo } from 'react';
import AddUserItem from './add-user-item';

interface AddUserFormProps {
  users: string[];
  selectedUsers: string[];
  currentPlayers: string[];
  selectUserFn: ChangeEventHandler<HTMLInputElement>;
  handleSelectAllFn: () => void;
}

const AddUserForm: FC<AddUserFormProps> = ({
  users,
  currentPlayers,
  selectUserFn,
  selectedUsers,
  handleSelectAllFn,
}) => {
  const currentPlayerSet = new Set(currentPlayers);
  const selectedUserSet = new Set(selectedUsers);
  const availableUsers = users.filter((user) => !currentPlayerSet.has(user));

  return (
    <>
      <div className='mb-1'>
        <PrimaryButton
          onClick={handleSelectAllFn}
          className='w-full'
          buttonType='outlined'
        >
          Select All
        </PrimaryButton>
      </div>
      <div className='flex flex-col gap-2'>
        {availableUsers.sort().map((user) => {
          const isUserSelected = selectedUserSet.has(user);

          return (
            <AddUserItem
              user={user}
              isUserSelected={isUserSelected}
              selectUserFn={selectUserFn}
              key={user}
            />
          );
        })}
        {currentPlayers.sort().map((user) => {
          const isUserSelected = selectedUserSet.has(user);
          return (
            <AddUserItem
              user={user}
              isUserSelected={isUserSelected}
              selectUserFn={selectUserFn}
              key={user}
            />
          );
        })}
      </div>
    </>
  );
};

export default AddUserForm;
