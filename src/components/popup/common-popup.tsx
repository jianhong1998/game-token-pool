import { FC, ReactNode } from 'react';

export type CommonPopupProps = {
  isOpen: boolean;
  closePopupFn: () => void;
};

type PopupProps = {
  children: ReactNode;
} & Pick<CommonPopupProps, 'isOpen'>;

const CommonPopup: FC<PopupProps> = ({ isOpen, children }) => {
  if (!isOpen) return <></>;

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
        {children}
      </div>
    </div>
  );
};

export default CommonPopup;
