export interface OutputFlags {
  json?: boolean;
  silent?: boolean;
}

export function writeOutput<T>(flags: OutputFlags, payload: T, text: string): void {
  if (flags.silent) {
    return;
  }

  if (flags.json) {
    console.log(JSON.stringify(payload));
    return;
  }

  console.log(text);
}
