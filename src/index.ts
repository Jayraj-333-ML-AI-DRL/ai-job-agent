#!/usr/bin/env node
import "dotenv/config";
import { Command } from "commander";
import { validateInputs } from "./inputs/validateInputs";
import { runAgent } from "./agent";
import { logger } from "./utils/logger";

const program = new Command();

program
  .name("job-agent")
  .description("Autonomous AI job application agent")
  .version("1.0.0");

program
  .command("apply")
  .description("Search jobs and generate application packages")
  .requiredOption("--role <role>",         "Target job role (e.g. \"Software Engineer\")")
  .requiredOption("--cv <path>",           "Path to your CV (PDF or .txt)")
  .requiredOption("--salary <salary>",     "Target salary (e.g. \"€75,000\" or \"$110k\")")
  .option("--count <n>",                   "Number of applications to generate (1–50)", "10")
  .option("--location <location>",         "Location filter (e.g. \"Berlin, Germany\")")
  .option("--remote <type>",               "remote | hybrid | onsite")
  .option("--seniority <level>",           "junior | early-career | mid | senior | lead", "mid")
  .option("--stack <stack>",               "Comma-separated tech stack (e.g. \"TypeScript,React\")")
  .option("--industry <industries>",       "Comma-separated industries (e.g. \"FinTech,SaaS\")")
  .option("--company-size <range>",        "Employee range (e.g. \"50-500\")")
  .option("--exclude <companies>",         "Comma-separated companies to skip")
  .option("--language <lang>",             "Application language", "English")
  .action(async (opts) => {
    try {
      const inputs = validateInputs({
        role:             opts.role,
        cvPath:           opts.cv,
        count:            parseInt(opts.count, 10),
        targetSalary:     opts.salary,
        location:         opts.location,
        remote:           opts.remote,
        seniority:        opts.seniority,
        stack:            opts.stack?.split(",").map((s: string) => s.trim()),
        industry:         opts.industry?.split(",").map((s: string) => s.trim()),
        companySize:      opts.companySize,
        excludeCompanies: opts.exclude?.split(",").map((s: string) => s.trim()),
        language:         opts.language,
      });

      logger.info("Starting AI Job Application Agent");
      logger.info(`Role: ${inputs.role}  |  Count: ${inputs.count}  |  Salary: ${inputs.targetSalary}`);

      await runAgent(inputs);

    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

program.parse(process.argv);
