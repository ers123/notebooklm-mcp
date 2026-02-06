export class BaseError extends Error {
  readonly code: string;
  readonly cause?: Error;

  constructor(message: string, code: string, cause?: Error) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.cause = cause;
  }
}

export class AuthError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'AUTH_ERROR', cause);
  }
}

export class BrowserError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'BROWSER_ERROR', cause);
  }
}

export class SessionError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'SESSION_ERROR', cause);
  }
}

export class SecurityError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'SECURITY_ERROR', cause);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
  }
}

export class TimeoutError extends BaseError {
  constructor(message: string, cause?: Error) {
    super(message, 'TIMEOUT_ERROR', cause);
  }
}
