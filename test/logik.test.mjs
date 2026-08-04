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
// isHeim: SpG-Heimspiel (Vereinsname steht mitten im SpG-Namen, z.B. A-Junioren)
assert.equal(isHeim({ heim: "SpG LSV Gorknitz 61 / SV Chemie Dohna 9er NWM" }), true);
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

// dedupe: Widget- und Druckansicht-Zeile derselben Begegnung verschmilzt, die reichere gewinnt
const dupWidget = { datumISO: "2026-08-22", uhrzeit: "09:00", altersklasse: "F-Junioren", heim: "SV Chemie Dohna - Kinderfestival", gast: "SV Chemie Dohna 1. U8/U9", ergebnis: "-:-", status: "scheduled", hinweis: "", spielort: "", wettbewerb: "01 - 22.08 - SV Chemie Dohna", spielart: "" };
const dupDruck  = { datumISO: "2026-08-22", uhrzeit: "09:00", altersklasse: "F-Junioren", heim: "SV Chemie Dohna - Kinderfestival", gast: "SV Chemie Dohna 1. U8/U9", ergebnis: "-:-", status: "scheduled", hinweis: "", spielort: "Stadion Dohna Rasenplatz", wettbewerb: "Vereinsturnier", spielart: "TU" };
const deduped = dedupe([dupWidget, dupDruck, { datumISO: "2026-08-22", uhrzeit: "11:00", altersklasse: "C-Junioren", heim: "SV Chemie Dohna", gast: "SpG Dorfhain / Pretzschendorf" }]);
assert.equal(deduped.length, 2); // 3 Zeilen -> 2 (Duplikat verschmolzen)
assert.equal(deduped[0].spielort, "Stadion Dohna Rasenplatz"); // reichere Zeile (Druckansicht) gewinnt
assert.equal(deduped[0].spielart, "TU");
assert.equal(deduped[1].altersklasse, "C-Junioren"); // unbeteiligte Zeile bleibt
// dedupe: gleiche Kennung-Duplikate aus derselben Quelle bleiben bei unterschiedlichen Teams getrennt
assert.equal(dedupe([dupDruck, { ...dupDruck, gast: "SV Chemie Dohna 2. U8/U9" }]).length, 2);

// filterSpiele: Klassen-Filter + Nur-Heim
const fAlle = filterSpiele(deduped, new Set(), false);
assert.equal(fAlle.length, 2); // leeres Set = alle
const fNurF = filterSpiele(deduped, new Set(["F-Junioren"]), false);
assert.equal(fNurF.length, 1);
assert.equal(fNurF[0].altersklasse, "F-Junioren");
const fHeim = filterSpiele(deduped, new Set(), true);
assert.equal(fHeim.length, 2); // beide beginnen mit "SV Chemie Dohna"
const fAuswaerts = filterSpiele([...deduped, { datumISO: "2026-08-29", uhrzeit: "15:00", altersklasse: "Herren", heim: "Radeberger SV", gast: "SV Chemie Dohna" }], new Set(), true);
assert.equal(fAuswaerts.length, 2); // Auswärtsspiel rausgefiltert

// teamCode: Mannschaftskürzel aus Altersklasse + Teamname
assert.equal(teamCode({ altersklasse: "Herren", heim: "SV Chemie Dohna", gast: "x" }), "H1");
assert.equal(teamCode({ altersklasse: "Herren", heim: "SV Chemie Dohna 2.", gast: "x" }), "H2");
assert.equal(teamCode({ altersklasse: "Herren", heim: "Radeberger SV", gast: "SV Chemie Dohna 2." }), "H2"); // Auswärts: wir = Gast
assert.equal(teamCode({ altersklasse: "A-Junioren", heim: "SpG LSV Gorknitz 61 / SV Chemie Dohna 9er NWM", gast: "x" }), "A");
assert.equal(teamCode({ altersklasse: "E-Junioren", heim: "Heidenauer SV - Kinderfestival", gast: "SV Chemie Dohna U10/U11 5x5" }), "E5"); // Festival: wir = Gast
assert.equal(teamCode({ altersklasse: "E-Junioren", heim: "SV Chemie Dohna - Kinderfestival", gast: "SV Chemie Dohna U10/U11 6x6" }), "E6");
assert.equal(teamCode({ altersklasse: "F-Junioren", heim: "SV Chemie Dohna - Kinderfestival", gast: "SV Chemie Dohna 2. U8/U9" }), "F2");
assert.equal(teamCode({ altersklasse: "F-Junioren", heim: "SV Chemie Dohna - Kinderfestival", gast: "SV Chemie Dohna 1. U8/U9" }), "F1");
assert.equal(teamCode({ altersklasse: "G-Junioren", heim: "SG Kesselsdorf - Kinderfestival", gast: "SV Chemie Dohna U7" }), "G");

// venueCode: Ortskürzel bei Heimspielen
assert.equal(venueCode({ heim: "SV Chemie Dohna", spielort: "Stadion Dohna Rasenplatz" }), "R");
assert.equal(venueCode({ heim: "SV Chemie Dohna 2.", spielort: "Stadion Dohna Kunstrasen" }), "KR");
assert.equal(venueCode({ heim: "SpG LSV Gorknitz 61 / SV Chemie Dohna 9er NWM", spielort: "Sportplatz Gorknitz" }), "GK");
assert.equal(venueCode({ heim: "SV Chemie Dohna", spielort: "" }), "R"); // Heimspiel ohne Ort = Rasen
assert.equal(venueCode({ heim: "Radeberger SV", spielort: "Stadion Schillerstr. Rasen" }), "@"); // Auswärts

// compCode: Wettbewerbskürzel
assert.equal(compCode({ spielart: "PO" }), "POK");
assert.equal(compCode({ spielart: "FS" }), "FS");
assert.equal(compCode({ spielart: "TU" }), "KF");
assert.equal(compCode({ spielart: "ME" }), "");
assert.equal(compCode({ spielart: "" }), "");

// ergAusUnsererSicht: bei Auswärts drehen
assert.equal(ergAusUnsererSicht({ heim: "SV Chemie Dohna", ergebnis: "3:1" }), "3:1");
assert.equal(ergAusUnsererSicht({ heim: "SC Freital II", ergebnis: "8:1" }), "1:8"); // Auswärts-Niederlage aus Chemie-Sicht
assert.equal(ergAusUnsererSicht({ heim: "SV Chemie Dohna", ergebnis: "-:-" }), ""); // kein Ergebnis -> leer

// gegner: die Fremdseite
assert.equal(gegner({ heim: "SV Chemie Dohna", gast: "SV Bannewitz" }), "SV Bannewitz");
assert.equal(gegner({ heim: "Radeberger SV", gast: "SV Chemie Dohna" }), "Radeberger SV");
console.log("Alle Logik-Tests bestanden.");
