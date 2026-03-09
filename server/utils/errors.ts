export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export class RateLimitExceededError extends Error {
  retryAfterSeconds?: number;

  constructor(message = "Too many workflow submissions right now", retryAfterSeconds?: number) {
    super(message);
    this.name = "RateLimitExceededError";
    if (retryAfterSeconds) {
      this.retryAfterSeconds = retryAfterSeconds;
    }
  }
}

export class UnsupportedProviderError extends Error {
  constructor(message = "Unsupported marketplace provider") {
    super(message);
    this.name = "UnsupportedProviderError";
  }
}
