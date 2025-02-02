import { ErrorCode } from '@/constants/error';

export class ErrorUtil {
  private constructor() {}

  public static isUserNotFoundError(errorMessage: string) {
    return errorMessage.toLowerCase().includes(ErrorCode.USER_NOT_EXIST);
  }
}
