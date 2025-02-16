import { FC, ReactNode } from 'react';

type HeaderProps = {
  children: ReactNode;
};

const Header: FC<HeaderProps> = ({ children }) => {
  return (
    <h1 className='text-2xl font-bold mb-4 text-primary text-center'>
      {children}
    </h1>
  );
};

export default Header;
