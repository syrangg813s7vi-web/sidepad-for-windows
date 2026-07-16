#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const updateId =
  process.env.WINDOWS_UUP_ID ?? "b045adcf-3361-4fd1-8afc-2533adf25431";
const language = process.env.WINDOWS_UUP_LANGUAGE ?? "zh-cn";
const edition = process.env.WINDOWS_UUP_EDITION ?? "professional";
const outputDir = path.resolve(
  process.env.WINDOWS_UUP_OUTPUT ?? ".windows-vm/UUPs",
);
const aria2 = process.env.ARIA2C ?? "aria2c";

const endpoint = new URL("https://uupdump.net/json-api/get.php");
endpoint.searchParams.set("id", updateId);
endpoint.searchParams.set("lang", language);
endpoint.searchParams.set("edition", edition);

console.log(`Fetching UUP manifest: ${endpoint}`);
const response = await fetch(endpoint);
if (!response.ok) {
  throw new Error(`UUP manifest request failed: HTTP ${response.status}`);
}

const payload = await response.json();
if (payload.response?.error) {
  throw new Error(`UUP API error: ${payload.response.error}`);
}

const entries = Object.entries(payload.response?.files ?? {}).filter(
  ([name]) =>
    !/^windows1.*-kb.*\.(cab|msu)$/i.test(name) &&
    !/aggregatedmetadata\.cab$/i.test(name),
);
if (entries.length === 0) {
  throw new Error("UUP manifest contained no downloadable files.");
}

await mkdir(outputDir, { recursive: true });
const ariaInput = entries.flatMap(([name, file]) => [
  file.url,
  `  out=${name}`,
  `  checksum=sha-256=${file.sha256}`,
]);
const inputPath = path.join(outputDir, "aria2.txt");
await writeFile(inputPath, `${ariaInput.join("\n")}\n`, "utf8");

const totalBytes = entries.reduce(
  (total, [, file]) => total + Number(file.size),
  0,
);
console.log(
  `Downloading ${entries.length} files (${(totalBytes / 1024 ** 3).toFixed(2)} GiB) to ${outputDir}`,
);

const child = spawn(
  aria2,
  [
    "--input-file",
    inputPath,
    "--dir",
    outputDir,
    "--continue=true",
    "--max-concurrent-downloads=8",
    "--split=8",
    "--min-split-size=4M",
    "--max-connection-per-server=8",
    "--file-allocation=none",
    "--auto-file-renaming=false",
    "--allow-overwrite=false",
    "--summary-interval=20",
  ],
  { stdio: "inherit" },
);

const exitCode = await new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("exit", resolve);
});

if (exitCode !== 0) {
  throw new Error(`aria2c exited with status ${exitCode}`);
}

console.log("UUP download and SHA-256 verification completed.");
