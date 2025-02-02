import { ButtonHTMLAttributes, FC, ReactNode } from 'react';

type PrimaryButtonProps = Partial<ButtonHTMLAttributes<HTMLButtonElement>> & {
  children: ReactNode;
  buttonType?: 'outlined' | 'link' | 'circle' | 'contained';
};

const PrimaryButton: FC<PrimaryButtonProps> = ({
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
      className={`btn ${buttonTypeClassName} btn-primary ${className} btn-md min-w-max px-2`}
      {...props}
    >
      {children}
    </button>
  );
};

export default PrimaryButton;
