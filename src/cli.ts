#!/usr/bin/env node

import process from "node:process";
import { Command } from "commander";
import { readHostsFile, WINDOWS_HOSTS_PATH, type HostEntry } from "./hosts.js";

const program = new Command();

program
  .name("host-control")
  .description("Show the current host mappings from the Windows hosts file.")
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

await program.parseAsync(process.argv);

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



