if (!state.name) state.name = "Unknown";

if (input.method === "change") {
  if (input.name) {
    state.name = input.name;
    state.balance = input.value;
  } else {
    console.log("");
  }
}
