/** Small bounded in-memory window for concurrent rotating-token requests. Never persist or log values. */
export class SessionSingleFlight<T> {
  private readonly entries = new Map<string, { promise: Promise<T>; until: number }>();
  private readonly retentionMs: number;
  private readonly capacity: number;
  constructor(retentionMs = 5000, capacity = 1000) {
    this.retentionMs = retentionMs;
    this.capacity = capacity;
  }

  run(key: string, task: () => Promise<T>): Promise<T> {
    const now = Date.now();
    for (const [storedKey, entry] of this.entries) if (entry.until <= now) this.entries.delete(storedKey);
    const existing = this.entries.get(key);
    if (existing) return existing.promise;
    if (this.entries.size >= this.capacity) return Promise.reject(new Error('Session refresh is busy'));
    const promise = Promise.resolve().then(task);
    const entry = { promise, until: now + 15_000 };
    this.entries.set(key, entry);
    void promise.then(() => { entry.until = Date.now() + this.retentionMs; }, () => { if (this.entries.get(key) === entry) this.entries.delete(key); });
    return promise;
  }
}
