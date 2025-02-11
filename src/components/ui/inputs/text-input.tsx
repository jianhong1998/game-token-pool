import {
  ChangeEventHandler,
  Dispatch,
  FC,
  KeyboardEventHandler,
  SetStateAction,
} from 'react';

type TextInputProps = {
  value: string;
  setValue: Dispatch<SetStateAction<string>>;
  disabled?: boolean;
  onEnterPressed?: () => void;
};

const TextInput: FC<TextInputProps> = ({
  setValue,
  value,
  disabled,
  onEnterPressed,
}) => {
  const handleOnChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setValue(e.target.value);
  };

  const handleKeyUpEvent: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key.toLowerCase() === 'enter' && onEnterPressed) {
      onEnterPressed();
    }
  };

  return (
    <input
      type='text'
      className='input w-full input-bordered rounded-md input-primary bg-white text-black'
      placeholder='Game Name'
      value={value}
      disabled={disabled}
      onChange={handleOnChange}
      onKeyUp={handleKeyUpEvent}
    />
  );
};

export default TextInput;
