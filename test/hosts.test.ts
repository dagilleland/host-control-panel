import test from "node:test";
import assert from "node:assert/strict";
import { parseHostsFile } from "../src/hosts.js";

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
