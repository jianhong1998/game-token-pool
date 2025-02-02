import {
  ChangeEventHandler,
  Dispatch,
  FC,
  KeyboardEventHandler,
  SetStateAction,
} from 'react';

type AmountInputProps = {
  amount: number;
  setAmount: Dispatch<SetStateAction<number>>;
  keyUpHandler?: KeyboardEventHandler<HTMLInputElement>;
  disabled?: boolean;
  maxNumber?: number;
};

const AmountInput: FC<AmountInputProps> = ({
  amount,
  setAmount,
  disabled,
  keyUpHandler,
  maxNumber,
}) => {
  const handleAmountChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    e.preventDefault();
    const inputValue = e.target.value;
    const inputFloat = Number.parseFloat(inputValue);

    /* Case - init amount is 0 && decreasing number (input is 0) */
    if ((amount === 0 && inputFloat === 0) || Number.isNaN(inputFloat)) {
      setAmount(0);
      return;
    }

    const inputValueDecimalLength = inputValue.split('.')[1]?.length ?? 0;
    const currentAmountDecimalLength =
      amount.toFixed(2).split('.')[1]?.length ?? 0;
    const isDecimalIncreased =
      inputValueDecimalLength > currentAmountDecimalLength; // Input always either increase or decrease decimals length

    /* Case - nagetive input */
    if (inputFloat < 0) {
      setAmount(0);
      return;
    }

    /* Case - backspace (decimal decreased) */
    if (!isDecimalIncreased) {
      const amountString = amount.toFixed(2);
      const newAmount =
        Number(amountString.slice(0, amountString.length - 1)) / 10;

      setAmount(newAmount);
      return;
    }

    /* Case - add number */
    const newAmount = inputFloat * 10;

    /* Case - new amount exceed max number */
    if (maxNumber && newAmount > maxNumber) {
      return;
    }

    setAmount(newAmount);
  };

  const keyDownHandler: KeyboardEventHandler<HTMLInputElement> = (e) => {
    const blackList = new Set(['arrowup', 'arrowdown']);
    const key = e.key.toLowerCase();

    if (blackList.has(key)) {
      e.preventDefault();
      return;
    }
  };

  return (
    <input
      type='number'
      className='input w-full input-bordered rounded-md input-primary bg-white text-black'
      placeholder='Pool Name'
      value={amount.toFixed(2)}
      disabled={disabled}
      onChange={handleAmountChange}
      onKeyUp={keyUpHandler}
      onKeyDown={keyDownHandler}
    />
  );
};

export default AmountInput;
