export class SnagSdkError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'SnagSdkError';
  }
}

export class SnagHttpError extends SnagSdkError {
  public readonly status: number;
  public readonly bodyText: string;

  public constructor(status: number, bodyText: string, message?: string) {
    super(message ?? `Snag API request failed with status ${status}`);
    this.name = 'SnagHttpError';
    this.status = status;
    this.bodyText = bodyText;
  }
}
