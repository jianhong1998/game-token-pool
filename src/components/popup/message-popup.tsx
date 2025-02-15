'use client';

import { FC, ReactNode, useState } from 'react';
import PrimaryButton from '../ui/buttons/primary-button';

interface IMessageRecord {
  message: string;
  node: ReactNode | null;
}

export const useCommonMessagePopup = () => {
  const [isPopupOpen, setIsPopupOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [messageObj, setMessageObj] = useState<IMessageRecord>({
    message: '',
    node: null,
  });

  const handleOpenPopup = (message: string | ReactNode, title?: string) => {
    if (typeof message === 'string') {
      setMessageObj({
        message,
        node: null,
      });
    } else {
      setMessageObj({
        message: '',
        node: message,
      });
    }

    setIsPopupOpen(true);

    if (title) {
      setTitle(title);
    }
  };

  const handleClosePopup = () => {
    setMessageObj({
      message: '',
      node: null,
    });
    setTitle('');
    setIsPopupOpen(false);
  };

  const popupComponent = (
    <CommonMessagePopup
      closePopupFn={handleClosePopup}
      isPopupOpen={isPopupOpen}
      messageRecord={messageObj}
      title={title}
    />
  );

  return {
    openPopup: handleOpenPopup,
    closePopup: handleClosePopup,
    popupComponent,
  };
};

interface MessagePopupProps {
  messageRecord: IMessageRecord;
  isPopupOpen: boolean;
  closePopupFn: () => void;
  title?: string;
}

const CommonMessagePopup: FC<MessagePopupProps> = ({
  closePopupFn,
  isPopupOpen,
  messageRecord,
  title,
}) => {
  if (!isPopupOpen) return <></>;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
        <div>
          {title && title.length > 0 && (
            <h2 className='text-2xl font-bold mb-4 text-primary text-center'>
              {title}
            </h2>
          )}
          {messageRecord.node ?? <p>{messageRecord.message}</p>}
        </div>
        <div className='flex flex-row justify-center'>
          <PrimaryButton
            buttonType='outlined'
            onClick={closePopupFn}
            className='px-5'
          >
            Ok
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};
