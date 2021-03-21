import * as fs from "fs";
import * as path from "path";
import { deserializeFile } from "valve-kv";

const addonEnglishPath = path.resolve(__dirname, "..", "game", "resource", "addon_english.txt");
const outPath = path.resolve(__dirname, "addon_english.csv");

// Deserialize addon_english.txt
const addon_english = deserializeFile(addonEnglishPath);

const root = addon_english["lang"];
const language = root["Language"];
const tokens = root["Tokens"];

// Serialize tokens to translation csv
const lines = [`"String ID","Source text","Translation"`];
for (const [k, v] of Object.entries(tokens)) {
    lines.push(`"${k}","${v}",""`);
}

// Write csv to outPath
fs.writeFileSync(outPath, lines.join("\n"));