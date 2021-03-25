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

function shouldWrite(key: string) {
    return (!key.endsWith("_titles_name") &&
        !key.endsWith("_titles_num") &&
        !key.endsWith("_twitter") &&
        !key.endsWith("_twitch") &&
        !key.endsWith("_discord") &&
        !key.endsWith("_website") &&
        !key.endsWith("_youtube") &&
        !((key.startsWith("npc_dota_hero_") || key.startsWith("npc_mud_golem_")) && !key.includes("_titles_")) &&
        !key.match(/npc_dota_tutorial_[a-zA-Z]+/)) || (
            key === "npc_dota_tutorial_translators" ||
            key === "npc_dota_tutorial_indiegogo" ||
            key === "npc_dota_tutorial_target_dummy" ||
            key === "npc_dota_tutorial_radiant_melee_creep" ||
            key === "npc_dota_tutorial_radiant_ranged_creep" ||
            key === "npc_dota_tutorial_dire_melee_creep" ||
            key === "npc_dota_tutorial_dire_ranged_creep" ||
            key === "npc_dota_tutorial_translators_titles_name" ||
            key === "npc_dota_tutorial_indiegogo_titles_name"
        );
}

// Serialize tokens to translation csv
const lines = [`"String ID","Source text","Translation"`];
for (const [k, v] of Object.entries(tokens)) {
    if (shouldWrite(k)) {
        lines.push(`"${k}","${v}",""`);
    }
}

// Write csv to outPath
fs.writeFileSync(outPath, lines.join("\n"));
