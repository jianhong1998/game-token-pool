'use client';

import { useInitPool } from '@/components/queries/pool/use-pool';
import { FC, KeyboardEventHandler, useEffect, useState } from 'react';

type InitPoolPopupProps = {
  isOpen: boolean;
  closePopup: () => void;
};

const InitPoolPopup: FC<InitPoolPopupProps> = ({ isOpen, closePopup }) => {
  const [poolName, setPoolName] = useState<string>('');
  const { mutateAsync: initPoolFn } = useInitPool();

  const handleSubmit = async () => {
    await initPoolFn(poolName);

    closePopup();
  };

  const handleEnter: KeyboardEventHandler<HTMLInputElement> = (e) => {
    const key = e.key.toLowerCase();

    if (key === 'enter') handleSubmit();
  };

  if (!isOpen) {
    return <></>;
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50'>
      <div className='bg-white rounded-lg p-8 max-w-md w-full gap-6 flex flex-col'>
        <div>
          <h2 className='text-2xl font-bold mb-4 text-primary text-center'>
            Initialise New Pool
          </h2>
          <input
            type='text'
            className='input w-full input-bordered rounded-md input-primary bg-white text-black'
            placeholder='Pool Name'
            value={poolName}
            onChange={(e) => setPoolName(e.target.value)}
            onKeyUp={handleEnter}
          />
        </div>
        <div className='flex flex-col gap-3'>
          <button
            className='btn btn-primary w-full'
            onClick={handleSubmit}
          >
            Submit
          </button>
          <button
            className='btn btn-primary btn-outline w-full'
            onClick={closePopup}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default InitPoolPopup;
