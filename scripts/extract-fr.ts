import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";

type Dict = Record<string, string>;

const SRC_GLOB = [
    "storefront/**/*.{js,jsx,ts,tsx}",
    "src/**/*.{js,jsx,ts,tsx}",
    "pages/**/*.{js,jsx,ts,tsx}",
];
const LOCALES_DIR = path.resolve("locales");
const OUT_FILE = path.join(LOCALES_DIR, "fr.json");

const ATTRS = new Set(["placeholder", "title", "aria-label", "alt"]);

function loadExisting(): Dict {
    if (!fs.existsSync(OUT_FILE)) return {};
    return JSON.parse(fs.readFileSync(OUT_FILE, "utf-8")) as Dict;
}

function normalizeText(s: string) {
    return s.replace(/\s+/g, " ").trim();
}

function makeKey(i: number) {
    return `auto.${String(i).padStart(4, "0")}`;
}

async function main() {



    const files = await fg(SRC_GLOB, { dot: false });
    const existing = loadExisting();

    const reverse = new Map<string, string>();
    for (const [k, v] of Object.entries(existing)) reverse.set(v, k);

    let counter = Object.keys(existing).filter(k => k.startsWith("auto.")).length;

    const out: Dict = { ...existing };

    for (const file of files) {
        const code = fs.readFileSync(file, "utf-8");

        let ast;
        try {
            ast = parse(code, {
                sourceType: "module",
                plugins: ["jsx", "typescript"],
            });
        } catch {
            continue;
        }

        traverse(ast, {
            JSXText(p) {
                const txt = normalizeText(p.node.value);
                if (!txt) return;

                // Ignore textes purement décoratifs
                if (/^[\.\-–—•·|/]+$/.test(txt)) return;

                if (reverse.has(txt)) return;

                counter += 1;
                const key = makeKey(counter);
                out[key] = txt;
                reverse.set(txt, key);
            },

            JSXAttribute(p) {
                const name = p.node.name;
                if (!t.isJSXIdentifier(name)) return;
                if (!ATTRS.has(name.name)) return;

                const val = p.node.value;
                if (!val) return;

                // ex: placeholder="Votre email"
                if (t.isStringLiteral(val)) {
                    const txt = normalizeText(val.value);
                    if (!txt) return;
                    if (reverse.has(txt)) return;

                    counter += 1;
                    const key = makeKey(counter);
                    out[key] = txt;
                    reverse.set(txt, key);
                }

                // ex: placeholder={"Votre email"} (rare)
                if (t.isJSXExpressionContainer(val) && t.isStringLiteral(val.expression)) {
                    const txt = normalizeText(val.expression.value);
                    if (!txt) return;
                    if (reverse.has(txt)) return;

                    counter += 1;
                    const key = makeKey(counter);
                    out[key] = txt;
                    reverse.set(txt, key);
                }
            },
        });
    }

    fs.mkdirSync(LOCALES_DIR, { recursive: true });
    fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + "\n", "utf-8");

    console.log(`✅ fr.json généré/complété : ${OUT_FILE}`);
    console.log(`🧩 Total clés: ${Object.keys(out).length}`);
}

main().catch((e) => {
    console.error("❌", e);
    process.exit(1);
});