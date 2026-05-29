import { describe, expect, test } from "vitest";
import { createMutex } from "./mutex";

describe("createMutex", () => {
  test("runs parallel runExclusive calls serially in invocation order", async () => {
    const mutex = createMutex();
    const events: string[] = [];

    const a = mutex.runExclusive(async () => {
      events.push("a-start");
      await new Promise((r) => setTimeout(r, 20));
      events.push("a-end");
      return "a";
    });
    const b = mutex.runExclusive(async () => {
      events.push("b-start");
      await new Promise((r) => setTimeout(r, 5));
      events.push("b-end");
      return "b";
    });

    const results = await Promise.all([a, b]);

    expect(results).toEqual(["a", "b"]);
    expect(events).toEqual(["a-start", "a-end", "b-start", "b-end"]);
  });

  test("releases the lock when fn throws so subsequent calls run", async () => {
    const mutex = createMutex();

    const failing = mutex.runExclusive(async () => {
      throw new Error("boom");
    });
    await expect(failing).rejects.toThrow("boom");

    const result = await mutex.runExclusive(async () => "ok");
    expect(result).toBe("ok");
  });

  test("resolution order matches invocation order across N calls", async () => {
    const mutex = createMutex();
    const order: number[] = [];

    const promises: Promise<number>[] = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        mutex.runExclusive(async () => {
          await new Promise((r) => setTimeout(r, 5));
          order.push(i);
          return i;
        }),
      );
    }

    const results = await Promise.all(promises);
    expect(results).toEqual([0, 1, 2, 3, 4]);
    expect(order).toEqual([0, 1, 2, 3, 4]);
  });
});
