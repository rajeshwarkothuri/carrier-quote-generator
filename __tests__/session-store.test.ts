import { describe, expect, it } from "vitest";
import { sessionStore, TTL_MS } from "@/lib/session/store";
import { MAYA } from "./helpers";

describe("session store", () => {
  it("issues unguessable ids and returns the profile", async () => {
    const a = await sessionStore.create({ profile: MAYA }), b = await sessionStore.create({ profile: MAYA });
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect((await sessionStore.get(a))?.profile.first_name).toBe("Maya");
  });
  it("expires and destroys", async () => {
    const t = Date.now();
    const id = await sessionStore.create({ profile: MAYA }, t);
    expect(await sessionStore.get(id, t + TTL_MS + 1)).toBeNull();
    const id2 = await sessionStore.create({ profile: MAYA });
    await sessionStore.destroy(id2);
    expect(await sessionStore.get(id2)).toBeNull();
    expect(await sessionStore.get("guess")).toBeNull();
  });
});
