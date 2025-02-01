import { forwardRef, HtmlHTMLAttributes, ReactNode } from 'react';

type PrimaryButtonProps = {
  children: ReactNode;
  type?: 'outlined' | 'link' | 'circle' | 'contained';
} & HtmlHTMLAttributes<HTMLButtonElement>;

const PrimaryButton = forwardRef<unknown, PrimaryButtonProps>(
  ({ children, className, type = 'contained', ...props }) => {
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
        className={`btn ${buttonTypeClassName} btn-primary ${className} btn-md w-max px-2`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

export default PrimaryButton;
