import { serialize } from "valve-kv";

import english from "./languages/english";
import german from "./languages/german";

export type LocalizationTable = typeof english;
export type LocalizationKey = keyof LocalizationTable;

function generateDeclarations() {
    const declarationLines = ["declare const enum LocalizationKey {"];

    for (const key of Object.keys(english)) {
        declarationLines.push(`    ${key} = "#${key}",`);
    }

    declarationLines.push("}");

    // TODO: Save to ../common/localization.d.ts?
    return declarationLines.join("\n");
}

function generateDotaLocalizationFile(localization: LocalizationTable, language: string) {
    const tokens = {
        lang: {
            Language: language,
            Tokens: localization,
        },
    };

    return serialize(tokens);
}

function generateTranslationCsv(otherLanguage: Partial<LocalizationTable>, otherLanguageName: string) {
    const lines = [`key,english,${otherLanguageName}`];

    for (const [k, valueEnglish] of Object.entries(english)) {
        lines.push(`${k},"${valueEnglish}","${otherLanguage[k as LocalizationKey] ?? ""}"`);
    }

    return lines.join("\n");
}

console.log(generateDeclarations());
console.log(generateDotaLocalizationFile(english, "english"));
console.log(generateTranslationCsv(german, "german"));
