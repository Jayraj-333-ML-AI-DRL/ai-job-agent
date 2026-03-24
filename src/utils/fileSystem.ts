import fs from "fs";
import path from "path";
import { logger } from "./logger";

export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    logger.debug(`Created directory: ${dirPath}`);
  }
}

export function writeFile(filePath: string, content: string | Buffer): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  logger.info(`Written: ${filePath}`);
}

export function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

export function buildOutputDir(role: string, baseDir: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  const safeName = role.replace(/[^a-zA-Z0-9]/g, "_");
  return path.join(baseDir, `${timestamp}_${safeName}`);
}

export function buildAppDir(outputDir: string, index: number, company: string): string {
  const safeCompany = company.replace(/[^a-zA-Z0-9]/g, "_");
  return path.join(outputDir, "applications", `${String(index).padStart(2, "0")}_${safeCompany}`);
}
