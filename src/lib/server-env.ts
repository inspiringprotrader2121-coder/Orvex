export class MissingServerEnvError extends Error {
  constructor(name: string) {
    super(`${name} is not configured`);
    this.name = "MissingServerEnvError";
  }
}

export function getRequiredServerEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new MissingServerEnvError(name);
  }

  return value;
}
