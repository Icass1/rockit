import { promises as fs } from "fs";
import path from "path";
import type { Lang } from "@/types/lang";

export async function getLang(lang: string): Promise<Lang> {
  const filePath = path.resolve(process.cwd(), "src/lang", `${lang}.json`);
  const file = await fs.readFile(filePath, "utf-8");
  return JSON.parse(file);
}
