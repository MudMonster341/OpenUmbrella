/* cast_p2.js — Part 2's cast, built from the cast spec in the part's script JSON (2026-11-18).
   Engine code names characters by role (CLAUDE.md rule 10): lead = the narrator, sib = the friend's younger brother.
   check_cast.mjs measures each one standing, in the browser, against the spec of the same `role` (height relative to the lead, within 0.02). */
export const CAST_P2 = {
  lead: { role: "lead", look: { skin: 0xe0ac82, hair: 0x2b2420, top: 0xff7a1a, bottom: 0x35445e, shoe: 0xf2f0ea } },   /* = Part 1's lead, unchanged */
  sib: {   /* 19, 0.92 of the lead, slighter, a younger face, his sister's skin, hair and teal; her teal scarf (teal is hers; red is the ghost's) */
    role: "sib",
    look: { skin: 0xd9a07a, hair: 0x3a2418, top: 0x3d4656, bottom: 0x2c2f38, shoe: 0xe9e4da, height: 0.92, age: 19, shoulderIn: 0.026, scarf: 0x1fb5a8 },
  },
};
