import { ChangeEventHandler, FC, Key } from 'react';

interface AddUserItemProps {
  user: string;
  isUserSelected: boolean;
  selectUserFn: ChangeEventHandler<HTMLInputElement>;
}

const AddUserItem: FC<AddUserItemProps> = ({
  user,
  isUserSelected,
  selectUserFn,
}) => {
  return (
    <div className='flex flex-row gap-2'>
      <input
        type='checkbox'
        className={`input input-sm checkbox-primary ${
          isUserSelected ? 'checked:' : ''
        }`}
        onChange={selectUserFn}
        checked={isUserSelected}
        value={user}
        name={user}
        id={`select-${user}`}
      />
      <label
        htmlFor={`select-${user}`}
        className='text-wrap text-left text-lg w-full'
      >
        {user}
      </label>
    </div>
  );
};

export default AddUserItem;
