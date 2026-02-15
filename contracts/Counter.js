// Basic Counter Contract
// State is persisted, input provides arguments

// Initialize state if first run
if (!state.count) state.count = 0;

if (input.method === "increment") {
  const amount = input.amount || 1;
  state.count += amount;
  console.log(
    `[CONTRACT] Counter incremented by ${amount}. New value: ${state.count}`,
  );
} else if (input.method === "reset") {
  state.count = 0;
  console.log(`[CONTRACT] Counter reset to 0.`);
} else {
  console.log(`[CONTRACT] Unknown method: ${input.method}`);
}
