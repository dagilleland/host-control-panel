import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { CLI_VERSION, createProgram } from "../src/program.js";
import {
  appendHostsEntry,
  DEFAULT_LOOPBACK_IP_ADDRESS,
  parseHostsFile,
  removeHostsEntry,
} from "../src/hosts.js";

test("parseHostsFile ignores comments and blank lines", () => {
  const content = `
# comment

127.0.0.1 localhost
::1 ipv6-localhost
`;

  assert.deepEqual(parseHostsFile(content), [
    {
      ipAddress: "127.0.0.1",
      hostnames: ["localhost"],
      lineNumber: 4,
    },
    {
      ipAddress: "::1",
      hostnames: ["ipv6-localhost"],
      lineNumber: 5,
    },
  ]);
});

test("parseHostsFile strips inline comments and keeps multiple hostnames", () => {
  const content = "10.0.0.5 api.local web.local # internal aliases";

  assert.deepEqual(parseHostsFile(content), [
    {
      ipAddress: "10.0.0.5",
      hostnames: ["api.local", "web.local"],
      lineNumber: 1,
    },
  ]);
});

test("appendHostsEntry appends a Windows-style hosts entry", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "host-control-"));
  const hostsFile = path.join(directory, "hosts");

  try {
    await writeFile(hostsFile, "127.0.0.1 localhost", "utf8");
    await appendHostsEntry(hostsFile, "api.local", "10.0.0.5");

    const updatedContent = await readFile(hostsFile, "utf8");

    assert.equal(updatedContent, "127.0.0.1 localhost\r\n10.0.0.5 api.local\r\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("appendHostsEntry defaults to the loopback address", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "host-control-"));
  const hostsFile = path.join(directory, "hosts");

  try {
    await writeFile(hostsFile, "", "utf8");
    await appendHostsEntry(hostsFile, "api.local");

    const updatedContent = await readFile(hostsFile, "utf8");

    assert.equal(updatedContent, `${DEFAULT_LOOPBACK_IP_ADDRESS} api.local\r\n`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("removeHostsEntry removes matching hostnames and preserves other aliases", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "host-control-"));
  const hostsFile = path.join(directory, "hosts");

  try {
    await writeFile(
      hostsFile,
      "10.0.0.5 api.local web.local # internal aliases\r\n127.0.0.1 api.local\r\n127.0.0.1 localhost\r\n",
      "utf8",
    );

    const removedCount = await removeHostsEntry(hostsFile, "api.local");
    const updatedContent = await readFile(hostsFile, "utf8");

    assert.equal(removedCount, 2);
    assert.equal(updatedContent, "10.0.0.5 web.local # internal aliases\r\n127.0.0.1 localhost\r\n");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("createProgram supports -v and --version", async () => {
  let output = "";

  const program = createProgram();

  program.exitOverride();
  program.configureOutput({
    writeOut: (value) => {
      output += value;
    },
    writeErr: (value) => {
      output += value;
    },
  });

  await assert.rejects(
    program.parseAsync(["node", "host-control", "-v"]),
    (error: unknown) =>
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "commander.version",
  );

  assert.equal(output.trim(), CLI_VERSION);
});

test("createProgram supports --add with hostname and IP address", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "host-control-"));
  const hostsFile = path.join(directory, "hosts");
  const originalLog = console.log;
  const loggedLines: string[] = [];

  try {
    await writeFile(hostsFile, "127.0.0.1 localhost\r\n", "utf8");
    console.log = (...values: unknown[]) => {
      loggedLines.push(values.map((value) => String(value)).join(" "));
    };

    await createProgram().parseAsync([
      "node",
      "host-control",
      "--file",
      hostsFile,
      "--add",
      "api.local",
      "10.0.0.5",
    ]);

    const updatedContent = await readFile(hostsFile, "utf8");

    assert.equal(updatedContent, "127.0.0.1 localhost\r\n10.0.0.5 api.local\r\n");
    assert.equal(loggedLines.at(-1), `Added api.local -> 10.0.0.5 to ${hostsFile}.`);
  } finally {
    console.log = originalLog;
    await rm(directory, { recursive: true, force: true });
  }
});

test("createProgram supports --add with only hostname and defaults to loopback", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "host-control-"));
  const hostsFile = path.join(directory, "hosts");
  const originalLog = console.log;
  const loggedLines: string[] = [];

  try {
    await writeFile(hostsFile, "", "utf8");
    console.log = (...values: unknown[]) => {
      loggedLines.push(values.map((value) => String(value)).join(" "));
    };

    await createProgram().parseAsync([
      "node",
      "host-control",
      "--file",
      hostsFile,
      "--add",
      "api.local",
    ]);

    const updatedContent = await readFile(hostsFile, "utf8");

    assert.equal(updatedContent, `${DEFAULT_LOOPBACK_IP_ADDRESS} api.local\r\n`);
    assert.equal(
      loggedLines.at(-1),
      `Added api.local -> ${DEFAULT_LOOPBACK_IP_ADDRESS} to ${hostsFile}.`,
    );
  } finally {
    console.log = originalLog;
    await rm(directory, { recursive: true, force: true });
  }
});

test("createProgram supports --remove with hostname", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "host-control-"));
  const hostsFile = path.join(directory, "hosts");
  const originalLog = console.log;
  const loggedLines: string[] = [];

  try {
    await writeFile(
      hostsFile,
      "10.0.0.5 api.local web.local\r\n127.0.0.1 api.local\r\n127.0.0.1 localhost\r\n",
      "utf8",
    );
    console.log = (...values: unknown[]) => {
      loggedLines.push(values.map((value) => String(value)).join(" "));
    };

    await createProgram().parseAsync([
      "node",
      "host-control",
      "--file",
      hostsFile,
      "--remove",
      "api.local",
    ]);

    const updatedContent = await readFile(hostsFile, "utf8");

    assert.equal(updatedContent, "10.0.0.5 web.local\r\n127.0.0.1 localhost\r\n");
    assert.equal(loggedLines.at(-1), `Removed 2 entries for api.local from ${hostsFile}.`);
  } finally {
    console.log = originalLog;
    await rm(directory, { recursive: true, force: true });
  }
});

test("createProgram explains that --add may require an elevated terminal", async () => {
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  const loggedErrors: string[] = [];

  try {
    console.error = (...values: unknown[]) => {
      loggedErrors.push(values.map((value) => String(value)).join(" "));
    };

    const permissionDeniedError = new Error("EPERM: operation not permitted") as NodeJS.ErrnoException;
    permissionDeniedError.code = "EPERM";

    await createProgram({
      appendHostsEntry: async () => {
        throw permissionDeniedError;
      },
      readHostsFile: async () => [],
      removeHostsEntry: async () => 0,
    }).parseAsync([
      "node",
      "host-control",
      "--file",
      "C:\\Windows\\System32\\drivers\\etc\\hosts",
      "--add",
      "api.local",
      "10.0.0.5",
    ]);

    assert.match(
      loggedErrors.at(-1) ?? "",
      /Run this command from an elevated terminal, such as PowerShell as Administrator/u,
    );
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
});

test("createProgram explains that --remove may require an elevated terminal", async () => {
  const originalError = console.error;
  const originalExitCode = process.exitCode;
  const loggedErrors: string[] = [];

  try {
    console.error = (...values: unknown[]) => {
      loggedErrors.push(values.map((value) => String(value)).join(" "));
    };

    const permissionDeniedError = new Error("EPERM: operation not permitted") as NodeJS.ErrnoException;
    permissionDeniedError.code = "EPERM";

    await createProgram({
      appendHostsEntry: async () => undefined,
      readHostsFile: async () => [],
      removeHostsEntry: async () => {
        throw permissionDeniedError;
      },
    }).parseAsync([
      "node",
      "host-control",
      "--file",
      "C:\\Windows\\System32\\drivers\\etc\\hosts",
      "--remove",
      "api.local",
    ]);

    assert.match(
      loggedErrors.at(-1) ?? "",
      /Run this command from an elevated terminal, such as PowerShell as Administrator/u,
    );
  } finally {
    console.error = originalError;
    process.exitCode = originalExitCode;
  }
});
