// Extrahiert die reinen Funktionen aus index.html und testet sie (kein DOM nötig).
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const code = html.split("// ==LOGIK-START==")[1].split("// ==LOGIK-END==")[0];
(0, eval)(code); // indirektes eval: deklariert die Funktionen im globalen Scope (direktes eval funktioniert im ESM-Strict-Mode nicht)

// weekendKey: Fr/Sa/So bleiben im Wochenende
assert.equal(weekendKey("2026-08-21"), "2026-08-21"); // Fr
assert.equal(weekendKey("2026-08-22"), "2026-08-21"); // Sa
assert.equal(weekendKey("2026-08-23"), "2026-08-21"); // So
// weekendKey: Mo-Do rutschen ins vorherige Wochenende
assert.equal(weekendKey("2026-08-19"), "2026-08-14"); // Mi -> Fr davor
assert.equal(weekendKey("2026-08-24"), "2026-08-21"); // Mo -> Fr davor
// sundayOf / fmtDate
assert.equal(sundayOf("2026-08-21"), "2026-08-23");
assert.equal(fmtDate("2026-08-21"), "21.08.2026");
// isHeim: Vereinspräfix inkl. 2. Mannschaft und Kinderfestival
assert.equal(isHeim({ heim: "SV Chemie Dohna" }), true);
assert.equal(isHeim({ heim: "SV Chemie Dohna 2." }), true);
assert.equal(isHeim({ heim: "SV Chemie Dohna - Kinderfestival" }), true);
assert.equal(isHeim({ heim: "Radeberger SV" }), false);
// gruppiere: Sortierung + Vergangenheitsflag
const g = gruppiere([
  { datumISO: "2026-08-23", uhrzeit: "15:00", heim: "x" },
  { datumISO: "2026-08-22", uhrzeit: "09:00", heim: "y" },
  { datumISO: "2026-08-19", uhrzeit: "19:30", heim: "z" }
], "2026-08-02");
assert.equal(g.length, 2); // 19.08 rutscht zu Wochenende 14.08
assert.equal(g[0].key, "2026-08-14");
assert.equal(g[1].key, "2026-08-21");
assert.equal(g[1].spiele[0].datumISO, "2026-08-22"); // Sortierung im Block
assert.equal(g[0].vergangen, false); // So 16.08.2026 > heute (02.08.)
assert.equal(g[1].vergangen, false);
assert.equal(gruppiere([{ datumISO: "2026-07-25", uhrzeit: "14:30", heim: "x" }], "2026-08-02")[0].vergangen, true); // So 26.07. < heute
console.log("Alle Logik-Tests bestanden.");
