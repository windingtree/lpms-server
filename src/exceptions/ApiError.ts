export default class ApiError extends Error {
  public errors;
  public status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }

  static UnauthorizedError() {
    return new ApiError(401, 'User is not authorized');
  }

  static BadRequest(message: string) {
    return new ApiError(400, message);
  }

  static AccessDenied() {
    return new ApiError(403, 'Access denied');
  }

  static NotFound(message: string) {
    return new ApiError(404, message || 'Not Found');
  }
}
