#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  createReadStream,
  mkdirSync,
  renameSync,
  rmSync,
  statSync,
} from "node:fs";
import { appendFile, mkdir, readFile, readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const url = process.env.DOWNLOAD_URL;
const output = path.resolve(process.env.DOWNLOAD_OUTPUT ?? "download.bin");
const expectedSha256 = process.env.DOWNLOAD_SHA256?.toLowerCase();
const partSize = Number(process.env.DOWNLOAD_PART_SIZE ?? 64 * 1024 * 1024);
const concurrency = Number(process.env.DOWNLOAD_CONCURRENCY ?? 64);
const partDir = `${output}.parts`;

if (!url || !expectedSha256) {
  throw new Error("DOWNLOAD_URL and DOWNLOAD_SHA256 are required.");
}

await mkdir(partDir, { recursive: true });
const totalSize = await getContentLength(url);
const parts = Array.from(
  { length: Math.ceil(totalSize / partSize) },
  (_, index) => ({
    index,
    start: index * partSize,
    end: Math.min(totalSize - 1, (index + 1) * partSize - 1),
    file: path.join(partDir, `${String(index).padStart(4, "0")}.part`),
  }),
);

let nextPart = 0;
let completed = 0;
const workers = Array.from(
  { length: Math.min(concurrency, parts.length) },
  async () => {
    while (nextPart < parts.length) {
      const part = parts[nextPart++];
      await downloadPart(part);
      completed += 1;
      console.log(
        `Downloaded ${completed}/${parts.length} parts (${Math.round((completed / parts.length) * 100)}%)`,
      );
    }
  },
);
await Promise.all(workers);

const existingParts = await readdir(partDir);
if (existingParts.length < parts.length) {
  throw new Error("Not all parts were downloaded.");
}

const temporaryOutput = `${output}.assembling`;
rmSync(temporaryOutput, { force: true });
for (const part of parts) {
  await appendFile(temporaryOutput, await readFile(part.file));
}

const actualSha256 = await hashFile(temporaryOutput);
if (actualSha256 !== expectedSha256) {
  throw new Error(
    `SHA-256 mismatch: expected ${expectedSha256}, received ${actualSha256}`,
  );
}

renameSync(temporaryOutput, output);
rmSync(partDir, { recursive: true, force: true });
console.log(`${output}\nSHA-256: ${actualSha256}`);

async function downloadPart(part) {
  const expectedSize = part.end - part.start + 1;
  try {
    if (statSync(part.file).size === expectedSize) return;
  } catch {
    // Missing or incomplete part; download it below.
  }

  mkdirSync(path.dirname(part.file), { recursive: true });
  const temporaryPart = `${part.file}.tmp`;
  const segment = `${temporaryPart}.segment`;

  for (let attempt = 1; attempt <= 40; attempt += 1) {
    await absorbSegment(segment, temporaryPart);
    const currentSize = fileSize(temporaryPart);
    if (currentSize === expectedSize) {
      renameSync(temporaryPart, part.file);
      return;
    }
    if (currentSize > expectedSize) {
      throw new Error(`Part ${part.index} exceeded its expected size.`);
    }

    rmSync(segment, { force: true });
    const requestStart = part.start + currentSize;
    try {
      await run("curl", [
        "--fail",
        "--silent",
        "--show-error",
        "--location",
        "--connect-timeout",
        "30",
        "--range",
        `${requestStart}-${part.end}`,
        "--output",
        segment,
        url,
      ]);
    } catch (error) {
      if (attempt === 40 && fileSize(segment) === 0) throw error;
    }
    await absorbSegment(segment, temporaryPart);
  }
  throw new Error(`Part ${part.index} could not be completed after 40 attempts.`);
}

async function absorbSegment(segment, temporaryPart) {
  const size = fileSize(segment);
  if (size === 0) return;
  await appendFile(temporaryPart, await readFile(segment));
  rmSync(segment, { force: true });
}

function fileSize(file) {
  try {
    return statSync(file).size;
  } catch {
    return 0;
  }
}

async function getContentLength(sourceUrl) {
  const output = await capture("curl", [
    "--fail",
    "--silent",
    "--show-error",
    "--location",
    "--head",
    sourceUrl,
  ]);
  const matches = [...output.matchAll(/^content-length:\s*(\d+)\s*$/gim)];
  if (matches.length === 0) {
    throw new Error("Could not determine Content-Length.");
  }
  return Number(matches.at(-1)[1]);
}

async function hashFile(file) {
  const hash = createHash("sha256");
  await pipeline(createReadStream(file), hash);
  return hash.digest("hex");
}

function run(command, args) {
  const child = spawn(command, args, { stdio: ["ignore", "ignore", "inherit"] });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code}`));
    });
  });
}

function capture(command, args) {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "inherit"] });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`${command} exited with status ${code}`));
    });
  });
}
