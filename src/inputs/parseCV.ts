import fs from "fs";
import path from "path";

export async function parseCV(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    // Dynamic import to avoid issues if pdf-parse is not installed
    const pdf = (await import("pdf-parse")).default;
    const buffer = fs.readFileSync(filePath);
    const data = await pdf(buffer);
    return data.text;
  }

  // Plain text / markdown fallback
  return fs.readFileSync(filePath, "utf-8");
}
