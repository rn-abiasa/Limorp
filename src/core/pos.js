export function selectValidator(stakes) {
  const entries = Object.entries(stakes);
  const total = entries.reduce((a, [, v]) => a + v, 0);

  let rand = Math.random() * total;

  for (const [addr, stake] of entries) {
    rand -= stake;
    if (rand <= 0) return addr;
  }
}
