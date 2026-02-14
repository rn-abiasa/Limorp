import vm from "vm";

export function runContract(code, state, input) {
  const sandbox = { state, input, console };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  return sandbox.state;
}
