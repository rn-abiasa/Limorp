import vm from "vm";

export function runContract(code, state, input, sender, value) {
  // 1. Persiapkan Sandbox dengan State yang ada
  // State otomatis menjadi variabel global di dalam kontrak
  const sandbox = {
    console,
    msg: {
      sender,
      value,
      input,
    },
    ...state,
  };

  vm.createContext(sandbox);

  // 2. Jalankan Kode Kontrak
  try {
    vm.runInContext(code, sandbox);

    // Auto-init for new deployments (empty state)
    if (Object.keys(state).length === 0 && typeof sandbox.init === "function") {
      sandbox.init();
    }
  } catch (e) {
    throw new Error(`Execution Error: ${e.message}`);
  }

  // 3. Panggil Method jika ada
  if (input && input.method && typeof sandbox[input.method] === "function") {
    const params = input.params || [];
    try {
      sandbox[input.method](...params);
    } catch (e) {
      throw new Error(`Method Error [${input.method}]: ${e.message}`);
    }
  }

  // 4. Harvesting State: Ambil semua variabel global (kecuali sistem & fungsi)
  const newState = {};
  const systemKeys = ["console", "msg"];

  for (const key in sandbox) {
    if (systemKeys.includes(key)) continue;
    if (typeof sandbox[key] === "function") continue;

    newState[key] = sandbox[key];
  }

  return newState;
}
