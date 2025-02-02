'use client';

import { FC, useState } from 'react';
import InitPoolPopup from './init-pool-popup';
import { useClosePool, useGetPools } from '@/components/queries/pool/use-pool';
import DangerButton from '@/components/ui/buttons/danger-button';

const InitPoolForm: FC = () => {
  const [isInitPoolPopupOpen, setIsInitPoolPopupOpen] =
    useState<boolean>(false);

  const { data: pools } = useGetPools();
  const { mutateAsync: closePoolFn, isPending: isClosePoolPending } =
    useClosePool();

  const toggleInitPoolPopup = () => {
    setIsInitPoolPopupOpen(!isInitPoolPopupOpen);
  };

  return (
    <>
      <div>
        <button
          className='btn btn-primary'
          onClick={toggleInitPoolPopup}
        >
          Create Pool
        </button>
      </div>
      <InitPoolPopup
        isOpen={isInitPoolPopupOpen}
        closePopup={toggleInitPoolPopup}
      />
      {(!pools || pools.length === 0) && (
        <h1 className='font-bold text-2xl text-center'>No pool initialised</h1>
      )}
      {pools && (
        <div className='flex flex-col gap-5 mt-3'>
          {pools.map((pool, index) => {
            return (
              <div
                key={index}
                className='card max-w-sm rounded overflow-scroll shadow-lg bg-white z-0'
              >
                <div className='card-body'>
                  <div>
                    <p>{pool.name}</p>
                    <p className='overflow-x-scroll'>{pool.publicKey}</p>
                  </div>
                  <div className='card-actions'>
                    <DangerButton
                      onClick={() => closePoolFn()}
                      disabled={isClosePoolPending}
                    >
                      Close Pool
                    </DangerButton>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
};

export default InitPoolForm;
