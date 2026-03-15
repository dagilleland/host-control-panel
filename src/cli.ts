#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import { readHostsFile, WINDOWS_HOSTS_PATH, type HostEntry } from "./hosts.js";

interface PackageMetadata {
  version: string;
}

export const CLI_VERSION = readPackageVersion();

export function createProgram(): Command {
  return new Command()
    .name("host-control")
    .description("Show the current host mappings from the Windows hosts file.")
    .version(CLI_VERSION, "-v, --version", "Display the CLI version.")
    .option(
      "-f, --file <path>",
      "Read from a specific hosts file path instead of the Windows default",
      WINDOWS_HOSTS_PATH,
    )
    .action(async ({ file }: { file: string }) => {
      try {
        const entries = await readHostsFile(file);
        renderEntries(entries, file);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error while reading the hosts file.";
        console.error(`Failed to read hosts file at "${file}": ${message}`);
        process.exitCode = 1;
      }
    });
}

if (isDirectExecution()) {
  await createProgram().parseAsync(process.argv);
}

function renderEntries(entries: HostEntry[], filePath: string): void {
  if (entries.length === 0) {
    console.log(`No host mappings found in ${filePath}.`);
    return;
  }

  const ipWidth = Math.max("IP Address".length, ...entries.map((entry) => entry.ipAddress.length));
  const hostWidth = Math.max(
    "Hostnames".length,
    ...entries.map((entry) => entry.hostnames.join(", ").length),
  );
  const lineWidth = Math.max("Line".length, ...entries.map((entry) => String(entry.lineNumber).length));

  console.log(`Hosts file: ${filePath}`);
  console.log(
    `${pad("Line", lineWidth)}  ${pad("IP Address", ipWidth)}  ${pad("Hostnames", hostWidth)}`,
  );
  console.log(`${"-".repeat(lineWidth)}  ${"-".repeat(ipWidth)}  ${"-".repeat(hostWidth)}`);

  for (const entry of entries) {
    console.log(
      `${pad(String(entry.lineNumber), lineWidth)}  ${pad(entry.ipAddress, ipWidth)}  ${entry.hostnames.join(", ")}`,
    );
  }
}

function pad(value: string, width: number): string {
  return value.padEnd(width, " ");
}

function isDirectExecution(): boolean {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function readPackageVersion(): string {
  const candidateUrls = [
    new URL("../package.json", import.meta.url),
    new URL("../../package.json", import.meta.url),
  ];

  for (const candidateUrl of candidateUrls) {
    try {
      const packageJson = JSON.parse(readFileSync(candidateUrl, "utf8")) as PackageMetadata;

      if (typeof packageJson.version === "string" && packageJson.version.length > 0) {
        return packageJson.version;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Unable to determine the CLI version from package.json.");
}
