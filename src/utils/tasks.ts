// Giving the browser a turn: long work split into tasks keeps the page responsive (and Total Blocking Time low).

/**
 * Resolves in a new task, after the browser has had a chance to paint and handle input. A message on a fresh
 * MessageChannel queues a task at once: no timer (so no 4 ms clamp, and it does not depend on timers at all, which a
 * test harness may hold still).
 */
export function nextTask(): Promise<void> {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
