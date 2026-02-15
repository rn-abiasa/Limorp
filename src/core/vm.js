import vm from "vm";

export function runContract(code, state, input, sender, value) {
  // 1. Persiapkan Sandbox
  const sandbox = { console };
  vm.createContext(sandbox);

  // 2. Jalankan kode untuk mendefinisikan Class
  vm.runInContext(code, sandbox);

  // 3. Cari Class yang didefinisikan (ambil yang pertama ditemukan)
  const ContractClass = Object.values(sandbox).find(
    (v) =>
      typeof v === "function" && v.prototype && v.prototype.constructor === v,
  );

  if (!ContractClass) {
    throw new Error("No Class definition found in contract code.");
  }

  // 4. Instansiasi dan Inject State + Context
  const instance = new ContractClass();

  // Masukkan state yang ada ke dalam instance properties
  Object.assign(instance, state);

  // Masukkan sistem properties (readonly/utility)
  instance.sender = sender;
  instance.value = value;
  instance.input = input;

  // 5. Dispatch Method
  if (input && input.method && typeof instance[input.method] === "function") {
    const params = input.params || [];
    instance[input.method](...params);
  }

  // 6. Harvesting: Ambil semua property (bukan fungsi) sebagai state baru
  const newState = {};
  const systemKeys = ["sender", "value", "input"]; // Key yang tidak boleh masuk ke state permanen

  for (const key of Object.getOwnPropertyNames(instance)) {
    if (systemKeys.includes(key)) continue;
    if (typeof instance[key] === "function") continue;
    newState[key] = instance[key];
  }

  // Tambahkan property yang mungkin menempel di instance (untuk ES6 classes)
  for (const key in instance) {
    if (systemKeys.includes(key)) continue;
    if (typeof instance[key] === "function") continue;
    if (!newState.hasOwnProperty(key)) {
      newState[key] = instance[key];
    }
  }

  return newState;
}
