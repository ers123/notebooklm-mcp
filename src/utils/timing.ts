export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise(resolve => setTimeout(resolve, delay));
}

export function typeDelay(): Promise<void> {
  return randomDelay(50, 150);
}

export function actionDelay(): Promise<void> {
  return randomDelay(500, 1500);
}

export function navigationDelay(): Promise<void> {
  return randomDelay(1000, 3000);
}
