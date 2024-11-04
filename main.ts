import { sprintf } from "jsr:@std/fmt/printf";
import { parseArgs } from "jsr:@std/cli/parse-args";
import {
    degrees,
    PDFDocument,
    PDFPage,
} from "https://cdn.skypack.dev/pdf-lib?dts";

const withSuffix = (path: string, suffix: string): string => {
    const parts = path.split(".");
    const extension = parts.pop() || "pdf";
    return parts.join(".") + suffix + "." + extension;
};

const rotatePages = async (
    path: string,
    degree: number,
    targetPages: number[],
): Promise<number> => {
    const baseData = await Deno.readFile(path);
    const baseDoc = await PDFDocument.load(baseData);
    const outDoc = await PDFDocument.create();

    const pages = await outDoc.copyPages(baseDoc, baseDoc.getPageIndices());
    pages.forEach((page: PDFPage, i: number) => {
        const added = outDoc.addPage(page);
        if (targetPages.length < 1 || targetPages.includes(i + 1)) {
            added.setRotation(degrees(degree));
        }
    });

    const bytes = await outDoc.save();
    const suf = sprintf("_rotate%03d", degree);
    const outPath = withSuffix(path, suf);
    await Deno.writeFile(outPath, bytes);
    return 0;
};

const parsePages = (pages: string): number[] => {
    return pages.split(",").map((s) => s.trim()).map((s) => {
        const n = Number(s);
        if (isNaN(n)) {
            console.log("invalid page:", s);
        }
        return n;
    }).filter((n) => !isNaN(n));
};

const main = async () => {
    const flags = parseArgs(Deno.args, {
        string: ["path", "degree", "pages"],
        default: {
            path: "",
            degree: "",
            pages: "",
        },
    });
    if (isNaN(Number(flags.degree))) {
        console.log("invalid arg:", flags.degree);
        Deno.exit(1);
    }
    let d = Number(flags.degree);
    if (d < 0) {
        d = 360 + d;
    }
    if (d % 90 != 0) {
        console.log("degree must be 90 unit. invalid:", flags.degree);
        Deno.exit(1);
    }
    const pages: number[] = flags.pages.length < 1
        ? []
        : parsePages(flags.pages);
    const result = await rotatePages(flags.path, d, pages);
    Deno.exit(result);
};

main();
