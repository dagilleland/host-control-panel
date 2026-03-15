import { readFileSync } from "node:fs";
import process from "node:process";
import { Command } from "commander";
import {
  appendHostsEntry,
  DEFAULT_LOOPBACK_IP_ADDRESS,
  readHostsFile,
  removeHostsEntry,
  toggleHostsEntry,
  WINDOWS_HOSTS_PATH,
  type HostEntry,
} from "./hosts.js";

interface PackageMetadata {
  version: string;
}

interface ProgramOptions {
  add?: boolean;
  file: string;
  remove?: boolean;
  toggle?: boolean;
}

interface ProgramDependencies {
  appendHostsEntry: typeof appendHostsEntry;
  readHostsFile: typeof readHostsFile;
  removeHostsEntry: typeof removeHostsEntry;
  toggleHostsEntry: typeof toggleHostsEntry;
}

export const CLI_VERSION = readPackageVersion();

export function createProgram(
  dependencies: ProgramDependencies = {
    appendHostsEntry,
    readHostsFile,
    removeHostsEntry,
    toggleHostsEntry,
  },
): Command {
  return new Command()
    .name("host-control")
    .description("Show the current host mappings from the Windows hosts file.")
    .version(CLI_VERSION, "-v, --version", "Display the CLI version.")
    .argument("[hostname]", "Hostname to add, remove, or toggle")
    .argument(
      "[ipAddress]",
      `IP address to append when using --add. Defaults to ${DEFAULT_LOOPBACK_IP_ADDRESS}`,
    )
    .option(
      "-f, --file <path>",
      "Read from a specific hosts file path instead of the Windows default",
      WINDOWS_HOSTS_PATH,
    )
    .option("-a, --add", "Append a new hosts entry using <hostname> [ipAddress]")
    .option("-r, --remove", "Remove all matching hosts entries for <hostname>")
    .option("-t, --toggle", "Toggle matching hosts entries for <hostname> between active and commented")
    .action(async (hostname: string | undefined, ipAddress: string | undefined, options: ProgramOptions) => {
      try {
        const selectedMutations = [options.add, options.remove, options.toggle].filter(Boolean).length;

        if (selectedMutations > 1) {
          throw new Error("Use only one of --add, --remove, or --toggle at a time.");
        }

        if (options.add) {
          if (hostname === undefined) {
            throw new Error("The --add flag requires <hostname>.");
          }

          const resolvedIpAddress = ipAddress ?? DEFAULT_LOOPBACK_IP_ADDRESS;
          await dependencies.appendHostsEntry(options.file, hostname, resolvedIpAddress);
          console.log(`Added ${hostname} -> ${resolvedIpAddress} to ${options.file}.`);
          return;
        }

        if (options.remove) {
          if (hostname === undefined) {
            throw new Error("The --remove flag requires <hostname>.");
          }

          if (ipAddress !== undefined) {
            throw new Error("The --remove flag only accepts <hostname>.");
          }

          const removedCount = await dependencies.removeHostsEntry(options.file, hostname);

          if (removedCount === 0) {
            console.log(`No entries found for ${hostname} in ${options.file}.`);
            return;
          }

          console.log(
            `Removed ${removedCount} ${removedCount === 1 ? "entry" : "entries"} for ${hostname} from ${options.file}.`,
          );
          return;
        }

        if (options.toggle) {
          if (hostname === undefined) {
            throw new Error("The --toggle flag requires <hostname>.");
          }

          if (ipAddress !== undefined) {
            throw new Error("The --toggle flag only accepts <hostname>.");
          }

          const toggled = await dependencies.toggleHostsEntry(options.file, hostname);
          const totalToggled = toggled.commentedCount + toggled.uncommentedCount;

          if (totalToggled === 0) {
            console.log(`No entries found for ${hostname} in ${options.file}.`);
            return;
          }

          console.log(
            `Toggled ${totalToggled} ${totalToggled === 1 ? "entry" : "entries"} for ${hostname} in ${options.file}. Disabled ${toggled.commentedCount}, enabled ${toggled.uncommentedCount}.`,
          );
          return;
        }

        if (hostname !== undefined || ipAddress !== undefined) {
          throw new Error("Positional arguments are only supported with the --add, --remove, or --toggle flag.");
        }

        const entries = await dependencies.readHostsFile(options.file);
        renderEntries(entries, options.file);
      } catch (error) {
        const message = formatHostsAccessError(error, options);
        console.error(`Failed to access hosts file at "${options.file}": ${message}`);
        process.exitCode = 1;
      }
    });
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

function formatHostsAccessError(error: unknown, options: ProgramOptions): string {
  const message =
    error instanceof Error ? error.message : "Unknown error while accessing the hosts file.";

  if ((options.add || options.remove || options.toggle) && isPermissionDeniedError(error)) {
    return `${message} Run this command from an elevated terminal, such as PowerShell as Administrator, to modify the Windows hosts file.`;
  }

  return message;
}

function isPermissionDeniedError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "EACCES" || error.code === "EPERM")
  );
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
