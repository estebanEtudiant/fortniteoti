import fs from "node:fs";
import path from "node:path";
import * as deepl from "deepl-node";

const LOCALES_DIR = path.resolve("locales");


const SOURCE_LANG = "fr";
const SOURCE_FILE = path.join(LOCALES_DIR, `${SOURCE_LANG}.json`);

// DeepL target codes (tu peux ajouter/enlever)
const TARGETS: deepl.TargetLanguageCode[] = [
    "en-US",
    "es",
];

const authKey = process.env.DEEPL_AUTH_KEY;
if (!authKey) {
    console.error("Missing DEEPL_AUTH_KEY env var");
    process.exit(1);
}

const translator = new deepl.Translator(authKey);

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

function isObject(v: unknown): v is JsonObject {
    return !!v && typeof v === "object" && !Array.isArray(v);
}

function readJson(filePath: string): JsonObject {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as JsonObject;
}

function writeJson(filePath: string, obj: JsonObject) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2) + "\n", "utf-8");
}

// Protège {var}, {{var}}, %s, %d etc.
function protectPlaceholders(input: string) {
    let out = input;

    // {name} ou {{name}}
    out = out.replace(/\{\{[^}]+\}\}|\{[^}]+\}/g, (m) => `__VAR__${m}__VAR__`);

    // %s %d %f etc.
    out = out.replace(/%[sdif]/g, (m) => `__FMT__${m}__FMT__`);

    return out;
}

function unprotectPlaceholders(input: string) {
    return input
        .replace(/__VAR__(\{\{[^}]+\}\}|\{[^}]+\})__VAR__/g, "$1")
        .replace(/__FMT__(%[sdif])__FMT__/g, "$1");
}

async function translateText(text: string, targetLang: deepl.TargetLanguageCode) {
    const protectedText = protectPlaceholders(text);
    const res = await translator.translateText(
        protectedText,
        SOURCE_LANG as deepl.SourceLanguageCode,
        targetLang
    );

    return unprotectPlaceholders(res.text);
}

/**
 * Traduit récursivement un JSON.
 * - Si une clé existe déjà dans le fichier cible => on la garde (pas d’écrasement).
 * - Sinon => on traduit depuis la source.
 */
async function translateJson(
    source: JsonObject,
    targetLang: deepl.TargetLanguageCode,
    existing: JsonObject
): Promise<JsonObject> {
    const out: JsonObject = Array.isArray(source) ? ([] as unknown as JsonObject) : {};

    for (const [k, v] of Object.entries(source)) {
        const prev = existing?.[k];

        if (typeof v === "string") {
            if (typeof prev === "string" && prev.trim().length > 0) {
                out[k] = prev; // conserve ta traduction manuelle
            } else {
                out[k] = await translateText(v, targetLang);
            }
            continue;
        }

        if (Array.isArray(v)) {
            // rare pour i18n, mais on gère
            const arrOut: JsonValue[] = [];
            const prevArr = Array.isArray(prev) ? prev : [];

            for (let i = 0; i < v.length; i++) {
                const item = v[i];
                const prevItem = prevArr[i];

                if (typeof item === "string") {
                    if (typeof prevItem === "string" && prevItem.trim().length > 0) {
                        arrOut[i] = prevItem;
                    } else {
                        arrOut[i] = await translateText(item, targetLang);
                    }
                } else if (isObject(item)) {
                    arrOut[i] = await translateJson(item, targetLang, isObject(prevItem) ? prevItem : {});
                } else {
                    arrOut[i] = item;
                }
            }

            out[k] = arrOut;
            continue;
        }

        if (isObject(v)) {
            out[k] = await translateJson(v, targetLang, isObject(prev) ? prev : {});
            continue;
        }

        // number/boolean/null
        out[k] = v;
    }

    return out;
}

function targetFileName(lang: deepl.TargetLanguageCode) {
    // Exemple : "en-US" -> "en", "pt-PT" -> "pt"
    // Si tu préfères garder "en-US.json", change ici.
    const short = lang.split("-")[0];
    return `${short}.json`;
}

async function main() {
    if (!fs.existsSync(SOURCE_FILE)) {
        console.error(`Source file not found: ${SOURCE_FILE}`);
        process.exit(1);
    }

    const source = readJson(SOURCE_FILE);

    for (const lang of TARGETS) {
        const targetFile = path.join(LOCALES_DIR, targetFileName(lang));

        const existing = fs.existsSync(targetFile) ? readJson(targetFile) : {};
        console.log(`Translating ${SOURCE_LANG}.json -> ${path.basename(targetFile)} (${lang})`);

        const translated = await translateJson(source, lang, existing);
        writeJson(targetFile, translated);

        console.log(`Wrote ${targetFile}`);
    }
}

main().catch((e) => {
    console.error("Translation failed:", e);
    process.exit(1);
});