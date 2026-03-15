import { readFile } from "node:fs/promises";

export const WINDOWS_HOSTS_PATH = "C:\\Windows\\System32\\drivers\\etc\\hosts";

export interface HostEntry {
  ipAddress: string;
  hostnames: string[];
  lineNumber: number;
}

export function parseHostsFile(content: string): HostEntry[] {
  return content
    .split(/\r?\n/u)
    .map((line, index) => parseHostsLine(line, index + 1))
    .filter((entry): entry is HostEntry => entry !== null);
}

export async function readHostsFile(
  path: string = WINDOWS_HOSTS_PATH,
): Promise<HostEntry[]> {
  const content = await readFile(path, "utf8");
  return parseHostsFile(content);
}

function parseHostsLine(line: string, lineNumber: number): HostEntry | null {
  const sanitizedLine = stripInlineComment(line).trim();

  if (sanitizedLine.length === 0) {
    return null;
  }

  const parts = sanitizedLine.split(/\s+/u);

  if (parts.length < 2) {
    return null;
  }

  const [ipAddress, ...hostnames] = parts;

  if (hostnames.length === 0) {
    return null;
  }

  return {
    ipAddress,
    hostnames,
    lineNumber,
  };
}

function stripInlineComment(line: string): string {
  const commentIndex = line.indexOf("#");
  return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}
