export function detectContractType(code = "") {
  const c = code.toLowerCase();
  if (c.includes("transfer") && c.includes("balances")) return "TOKEN";
  if (c.includes("mint") && (c.includes("ownerof") || c.includes("uri")))
    return "NFT";
  if (c.includes("register") || c.includes("setname") || c.includes("registry"))
    return "REGISTRY";
  return "GENERIC";
}
