import CommonPopup, { CommonPopupProps } from '@/components/popup/common-popup';
import PrimaryButton from '@/components/ui/buttons/primary-button';
import AmountInput from '@/components/ui/inputs/amount-input';
import Header from '@/components/ui/typography/header';
import { Dispatch, FC, SetStateAction, useEffect, useState } from 'react';

interface AmountInputWrapperProps {
  username: string;
  multiTransferData: IMultiTransferData;
  setMultiTransferData: Dispatch<SetStateAction<IMultiTransferData>>;
  maxAmount: number;
  isDisabled?: boolean;
}

const AmountInputWrapper: FC<AmountInputWrapperProps> = ({
  username,
  multiTransferData,
  setMultiTransferData,
  isDisabled,
  maxAmount,
}) => {
  const [amount, setAmount] = useState<number>(
    multiTransferData.find((data) => data.username === username)?.cashAmount ??
      0
  );

  useEffect(() => {
    setMultiTransferData((prev) => {
      const arr = [...prev];

      const index = arr.findIndex((data) => data.username === username);
      arr[index].cashAmount = amount;

      return arr;
    });
  }, [amount, setMultiTransferData, username]);

  return (
    <AmountInput
      amount={amount}
      setAmount={setAmount}
      disabled={isDisabled}
      maxNumber={maxAmount}
    />
  );
};

interface MultiTransferFormProps {
  multiTransferData: IMultiTransferData;
  setMultiTransferData: Dispatch<SetStateAction<IMultiTransferData>>;
  isDisabled: boolean;
  maxAmount: number;
}

const MultiTransferForm: FC<MultiTransferFormProps> = ({
  multiTransferData,
  setMultiTransferData,
  isDisabled,
  maxAmount,
}) => {
  return (
    <table>
      <tbody>
        {multiTransferData.map((data) => (
          <tr key={data.username}>
            <td>{data.username}</td>
            <td>
              <AmountInputWrapper
                username={data.username}
                multiTransferData={multiTransferData}
                setMultiTransferData={setMultiTransferData}
                isDisabled={isDisabled}
                maxAmount={maxAmount}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export type IMultiTransferData = {
  username: string;
  cashAmount: number;
}[];

interface MultiTransferPopupProps extends CommonPopupProps {
  currentPlayers: string[];
  transferFn: (transferInfoArray: IMultiTransferData) => Promise<void>;
  maxAmount: number;
  disable?: boolean;
}

const MultiTransferPopup: FC<MultiTransferPopupProps> = ({
  closePopupFn,
  isOpen,
  currentPlayers,
  transferFn,
  disable,
  maxAmount,
}) => {
  const [transferData, setTransferData] = useState<IMultiTransferData>(
    currentPlayers.map((playerName) => ({
      username: playerName,
      cashAmount: 0,
    }))
  );

  const handleTransfer = async () => {
    try {
      await transferFn(transferData);
      setTransferData(
        currentPlayers.map((playerName) => ({
          username: playerName,
          cashAmount: 0,
        }))
      );
      closePopupFn();
    } catch (_error) {}
  };

  useEffect(() => {
    const map = new Map<string, number>(
      transferData.map(({ username, cashAmount }) => [username, cashAmount])
    );

    const newArr: IMultiTransferData = currentPlayers.map((playerName) => {
      const cashAmount = map.get(playerName) ?? 0;
      return { cashAmount, username: playerName };
    });

    setTransferData(newArr);
  }, [currentPlayers, transferData]);

  return (
    <CommonPopup isOpen={isOpen}>
      <Header>Transfer To Multiple Users</Header>

      <MultiTransferForm
        isDisabled={disable ?? false}
        multiTransferData={transferData.sort((a, b) => {
          if (a.username > b.username) return 1;
          if (a.username < b.username) return -1;
          return 0;
        })}
        setMultiTransferData={setTransferData}
        maxAmount={maxAmount}
      />

      <div className='flex flex-row gap-3'>
        <PrimaryButton
          buttonType='contained'
          className='flex-1'
          onClick={handleTransfer}
        >
          Transfer
        </PrimaryButton>
        <PrimaryButton
          buttonType='outlined'
          onClick={closePopupFn}
          className='flex-1'
        >
          Close
        </PrimaryButton>
      </div>
    </CommonPopup>
  );
};

export default MultiTransferPopup;
