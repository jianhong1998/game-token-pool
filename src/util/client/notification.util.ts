import toast, { ToastOptions } from 'react-hot-toast';

export class NotificationUtil {
  private static readonly toastConfig: ToastOptions = {
    className: 'w-full',
  };

  private constructor() {}

  public static success(message: string) {
    return toast.success(message, this.toastConfig);
  }

  public static error(message: string) {
    return toast.error(message, this.toastConfig);
  }

  public static loading(message: string) {
    return toast.loading(message, this.toastConfig);
  }
}
