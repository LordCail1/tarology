import { isTransientClientApiError } from "./client-api";

const MAX_TRANSIENT_LOAD_ATTEMPTS = 2;

export async function retryTransientClientLoad(task: () => Promise<void>): Promise<void> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_TRANSIENT_LOAD_ATTEMPTS; attempt += 1) {
    try {
      await task();
      return;
    } catch (error) {
      lastError = error;

      if (!isTransientClientApiError(error) || attempt === MAX_TRANSIENT_LOAD_ATTEMPTS - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}
