import { FC } from 'react';

type DividerProps = {
  className?: string;
};

const Divider: FC<DividerProps> = ({ className }) => {
  return (
    <hr
      className={`border-t border-2 border-gray-200 w-full mx-auto my-4 ${className}`}
    />
  );
};

export default Divider;
