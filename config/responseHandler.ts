type SuccessResponseType = { status: String; message: String; data: any };
const sendResponse = (data: any, message: string): SuccessResponseType => ({
  status: "success",
  message,
  data,
});

type ErrorResponseType = { status: number; message?: String; data?: any };
const sendErrorResponse = (
  status: number,
  data: any,
  message: string,
): ErrorResponseType => ({
  status,
  message,
  data,
});
