import { Level } from "level";

const db = new Level("./db/chain", { valueEncoding: "json" });

export default {
  save: async (state) => {
    if (db.status !== "open") await db.open();
    // Convert BigInts to strings for JSON serialization
    const serializedState = JSON.parse(
      JSON.stringify(state, (key, value) =>
        typeof value === "bigint" ? value.toString() : value,
      ),
    );
    await db.put("blockchain_state", serializedState);
  },
  load: async () => {
    if (db.status !== "open") await db.open();
    try {
      const state = await db.get("blockchain_state");
      return state;
    } catch (e) {
      return null;
    }
  },
  close: async () => {
    if (db.status === "open") await db.close();
  },
};
