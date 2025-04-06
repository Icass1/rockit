import { promises as fs } from "fs";
import { NextResponse } from "next/server";
import path from "path";

async function listFilesRecursive(
    dirPath: string,
    relativePath: string = ""
): Promise<string[]> {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    // console.log("entries", entries)
    const files: string[] = [];

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const currentRelativePath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
            const nestedFiles = await listFilesRecursive(
                fullPath,
                currentRelativePath
            );
            files.push(...nestedFiles);
        } else {
            files.push(currentRelativePath);
        }
    }

    return files;
}

export async function GET() {
    const dirPath = ".next/static";

    const files = await listFilesRecursive(dirPath);

    return NextResponse.json(files);
}
