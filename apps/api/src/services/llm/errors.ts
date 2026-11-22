export class LlmError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmError";
  }
}

export class RateLimitError extends LlmError {
  readonly retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class AuthError extends LlmError {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export class ProviderUnavailableError extends LlmError {
  constructor(message: string) {
    super(message);
    this.name = "ProviderUnavailableError";
  }
}

export class BadResponseError extends LlmError {
  constructor(message: string) {
    super(message);
    this.name = "BadResponseError";
  }
}
