import { SpecCraftError } from "../errors";

export function formatError(error: unknown): string {
  if (error instanceof SpecCraftError) {
    return error.format();
  }

  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }

  return `An unexpected error occurred: ${String(error)}`;
}

export function handleError(error: unknown): never {
  console.error(formatError(error));
  process.exit(1);
}
