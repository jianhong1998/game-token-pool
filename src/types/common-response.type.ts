type ISuccessResponse<T> = {
  isSuccess: true;
  data: T;
};

type IErrorResponse = {
  isSuccess: false;
  error: {
    message: string;
    name: string;
    stack?: string;
    cause?: unknown;
  };
};

export type ICommonResponse<T> = ISuccessResponse<T> | IErrorResponse;
