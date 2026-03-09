export class InsufficientCreditsError extends Error {
  constructor(message = "Insufficient credits") {
    super(message);
    this.name = "InsufficientCreditsError";
  }
}

export class RateLimitExceededError extends Error {
  constructor(message = "Too many workflow submissions right now") {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

export class UnsupportedProviderError extends Error {
  constructor(message = "Unsupported marketplace provider") {
    super(message);
    this.name = "UnsupportedProviderError";
  }
}
