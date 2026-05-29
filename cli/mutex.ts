export interface AsyncMutex {
  runExclusive<T>(fn: () => Promise<T>): Promise<T>;
}

export function createMutex(): AsyncMutex {
  let tail: Promise<void> = Promise.resolve();

  return {
    runExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const result = tail.then(fn);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
