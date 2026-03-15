import { appendFile, readFile, writeFile } from "node:fs/promises";

export const WINDOWS_HOSTS_PATH = "C:\\Windows\\System32\\drivers\\etc\\hosts";
export const DEFAULT_LOOPBACK_IP_ADDRESS = "127.0.0.1";

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

export async function appendHostsEntry(
  path: string,
  hostname: string,
  ipAddress: string = DEFAULT_LOOPBACK_IP_ADDRESS,
): Promise<void> {
  const trimmedHostname = normalizeHostname(hostname);
  const trimmedIpAddress = normalizeIpAddress(ipAddress);

  const existingContent = await readFile(path, "utf8");
  const prefix = existingContent.length > 0 && !existingContent.endsWith("\n") ? "\r\n" : "";

  await appendFile(path, `${prefix}${trimmedIpAddress} ${trimmedHostname}\r\n`, "utf8");
}

export async function removeHostsEntry(path: string, hostname: string): Promise<number> {
  const trimmedHostname = normalizeHostname(hostname);
  const originalContent = await readFile(path, "utf8");
  const lineEnding = originalContent.includes("\r\n") ? "\r\n" : "\n";
  const lines = originalContent.split(/\r?\n/u);
  let removedCount = 0;
  const updatedLines: string[] = [];

  for (const line of lines) {
    const updatedLine = removeHostnameFromLine(line, trimmedHostname);
    removedCount += updatedLine.removedCount;

    if (updatedLine.content !== null) {
      updatedLines.push(updatedLine.content);
    }
  }

  if (removedCount > 0) {
    await writeFile(path, updatedLines.join(lineEnding), "utf8");
  }

  return removedCount;
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

function removeHostnameFromLine(
  line: string,
  hostname: string,
): { content: string | null; removedCount: number } {
  const commentIndex = line.indexOf("#");
  const contentWithoutComment = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
  const comment = commentIndex >= 0 ? line.slice(commentIndex) : "";
  const sanitizedLine = contentWithoutComment.trim();

  if (sanitizedLine.length === 0) {
    return { content: line, removedCount: 0 };
  }

  const parts = sanitizedLine.split(/\s+/u);

  if (parts.length < 2) {
    return { content: line, removedCount: 0 };
  }

  const [ipAddress, ...hostnames] = parts;
  const remainingHostnames = hostnames.filter((currentHostname) => currentHostname !== hostname);
  const removedCount = hostnames.length - remainingHostnames.length;

  if (removedCount === 0) {
    return { content: line, removedCount: 0 };
  }

  if (remainingHostnames.length === 0) {
    return { content: null, removedCount };
  }

  const rebuiltLine = `${ipAddress} ${remainingHostnames.join(" ")}${comment.length > 0 ? ` ${comment}` : ""}`;
  return { content: rebuiltLine, removedCount };
}

function stripInlineComment(line: string): string {
  const commentIndex = line.indexOf("#");
  return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}

function normalizeHostname(hostname: string): string {
  const trimmedHostname = hostname.trim();

  if (trimmedHostname.length === 0) {
    throw new Error("Hostname is required.");
  }

  if (/\s/u.test(trimmedHostname)) {
    throw new Error("Hostname must not contain whitespace.");
  }

  return trimmedHostname;
}

function normalizeIpAddress(ipAddress: string): string {
  const trimmedIpAddress = ipAddress.trim();

  if (trimmedIpAddress.length === 0) {
    throw new Error("IP address is required.");
  }

  if (/\s/u.test(trimmedIpAddress)) {
    throw new Error("IP address must not contain whitespace.");
  }

  return trimmedIpAddress;
}
