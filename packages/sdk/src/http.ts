import { SnagHttpError, SnagSdkError } from './errors.js';

export async function requestJson<TResponse>(
  fetchFn: typeof fetch,
  input: string,
  init?: RequestInit,
): Promise<TResponse> {
  let response: Response;
  try {
    response = await fetchFn(input, init);
  } catch (error: unknown) {
    throw new SnagSdkError(`Network request failed: ${toErrorMessage(error)}`);
  }

  if (!response.ok) {
    const bodyText = await safeReadText(response);
    throw new SnagHttpError(response.status, bodyText);
  }

  try {
    return (await response.json()) as TResponse;
  } catch (error: unknown) {
    throw new SnagSdkError(`Failed to parse JSON response: ${toErrorMessage(error)}`);
  }
}

export async function requestNoContent(fetchFn: typeof fetch, input: string, init?: RequestInit): Promise<void> {
  let response: Response;
  try {
    response = await fetchFn(input, init);
  } catch (error: unknown) {
    throw new SnagSdkError(`Network request failed: ${toErrorMessage(error)}`);
  }

  if (!response.ok && response.status !== 204) {
    const bodyText = await safeReadText(response);
    throw new SnagHttpError(response.status, bodyText);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}
