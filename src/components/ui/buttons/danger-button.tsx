import { ButtonHTMLAttributes, FC, ReactNode } from 'react';

type DangerButtonProps = Partial<ButtonHTMLAttributes<HTMLButtonElement>> & {
  children: ReactNode;
  buttonType?: 'outlined' | 'link' | 'circle' | 'contained';
};

const DangerButton: FC<DangerButtonProps> = ({
  children,
  className,
  buttonType: type = 'contained',
  ...props
}) => {
  let buttonTypeClassName = '';

  switch (type) {
    case 'outlined':
      buttonTypeClassName = 'btn-outline';
      break;
    case 'link':
      buttonTypeClassName = 'btn-link';
      break;
    case 'circle':
      buttonTypeClassName = 'btn-circle';
      break;
    case 'contained':
    default:
      break;
  }

  return (
    <button
      className={`btn ${buttonTypeClassName} btn-error ${className} btn-md min-w-max px-2`}
      {...props}
    >
      {children}
    </button>
  );
};

export default DangerButton;
