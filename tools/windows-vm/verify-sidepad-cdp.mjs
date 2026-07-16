#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const debugPort = Number(process.env.SIDEPAD_CDP_PORT ?? 19222);
const webQaUrl = process.env.SIDEPAD_WEB_QA_URL ?? "https://example.com";
const webQaTitle = process.env.SIDEPAD_WEB_QA_TITLE ?? "Example Domain";
const outputPath = path.resolve(
  process.env.SIDEPAD_CDP_REPORT ??
    ".windows-vm/Sidepad-Windows-11-x64.utm/Data/cdp-report.json",
);
const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

class Cdp {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(
      url.replace(/:(?:9222|19222)\//, `:${debugPort}/`),
    );
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId++;
    const response = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return response;
  }

  async eval(expression) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
    });
    if (response.exceptionDetails) {
      throw new Error(
        response.exceptionDetails.exception?.description ??
          response.exceptionDetails.text,
      );
    }
    return response.result.value;
  }

  close() {
    this.socket.close();
  }
}

async function waitFor(callback, message, timeout = 60_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try {
      const result = await callback();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }
  throw new Error(`${message}${lastError ? `: ${lastError.message}` : ""}`);
}

async function getTargets() {
  const response = await fetch(`http://127.0.0.1:${debugPort}/json/list`);
  if (!response.ok) throw new Error(`CDP HTTP ${response.status}`);
  return response.json();
}

async function setItem(main, item) {
  await main.eval(`(() => {
    localStorage.setItem("sidepad.items", JSON.stringify([${JSON.stringify(item)}]));
    localStorage.setItem("sidepad.activeId", ${JSON.stringify(item.id)});
    location.reload();
    return true;
  })()`);
  await sleep(1_200);
}

async function findFixtureDrive(main) {
  return main.eval(`(async () => {
    for (const letter of ["D", "E", "F", "G", "H", "I", "J", "K"]) {
      const candidate = letter + ":\\\\sample.docx";
      if (await window.sidepad.authorizeFile(candidate)) return letter;
    }
    return null;
  })()`);
}

async function importFixture(main, drive, extension) {
  const filePath = `${drive}:\\sample.${extension}`;
  const descriptor = await main.eval(
    `window.sidepad.importFiles([${JSON.stringify(filePath)}]).then(files => files[0])`,
  );
  if (!descriptor) throw new Error(`Could not import ${filePath}`);
  await setItem(main, {
    id: `qa-${extension}`,
    type: "file",
    ...descriptor,
    color: "#3f4657",
  });
}

async function readGuestReport() {
  const reportUrl = "file:///C:/SidepadTest/report.json";
  const response = await fetch(
    `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(reportUrl)}`,
    { method: "PUT" },
  );
  if (!response.ok) return null;
  const target = await response.json();
  const page = new Cdp(target.webSocketDebuggerUrl);
  try {
    await page.send("Runtime.enable");
    return await waitFor(
      async () => {
        const text = await page.eval("document.body?.innerText || ''");
        if (!text.trim()) return null;
        try {
          return JSON.parse(text);
        } catch {
          return null;
        }
      },
      "Guest verification report did not become readable",
      15_000,
    );
  } finally {
    page.close();
  }
}

const targets = await waitFor(
  async () => {
    const list = await getTargets();
    return list.some((target) => target.url.includes("index.html")) &&
      list.some((target) => target.url.includes("edge.html"))
      ? list
      : null;
  },
  "Sidepad renderer targets did not appear",
);
const mainTarget = targets.find((target) => target.url.includes("index.html"));
const edgeTarget = targets.find((target) => target.url.includes("edge.html"));
const main = new Cdp(mainTarget.webSocketDebuggerUrl);
const edge = new Cdp(edgeTarget.webSocketDebuggerUrl);
await Promise.all([main.send("Runtime.enable"), edge.send("Runtime.enable")]);

const report = {
  timestamp: new Date().toISOString(),
  cdp_port: debugPort,
  checks: {},
};

try {
  report.checks.renderers = await main.eval(`({
    docx: typeof window.docx?.renderAsync === "function",
    zip: typeof window.JSZip?.loadAsync === "function",
    excel: typeof window.ExcelJS?.Workbook === "function",
    pptx: typeof window.pptxPreview?.init === "function"
  })`);

  await edge.eval(
    "window.sidepad.enter(new URLSearchParams(location.search).get('displayId'))",
  );
  report.checks.edge_expand = await waitFor(
    () => main.eval('document.body.classList.contains("expanded")'),
    "Edge trigger did not expand the panel",
  );
  await main.eval("window.sidepad.collapse()");
  report.checks.programmatic_collapse = await waitFor(
    async () => !(await main.eval('document.body.classList.contains("expanded")')),
    "Panel did not collapse",
  );

  await setItem(main, {
    id: "qa-note",
    type: "note",
    name: "Windows x64 QA Note",
    content: "Persisted note",
    color: "#7566ec",
  });
  await waitFor(
    () => main.eval('document.querySelector("#noteEditor")?.value === "Persisted note"'),
    "Note did not restore",
  );
  report.checks.note_persistence = await main.eval(`(() => {
    const editor = document.querySelector("#noteEditor");
    editor.value = "Updated note on Windows x64";
    editor.dispatchEvent(new Event("input", { bubbles: true }));
    return JSON.parse(localStorage.getItem("sidepad.items"))[0].content;
  })()`);

  await setItem(main, {
    id: "qa-web",
    type: "web",
    name: "Web QA",
    url: webQaUrl,
    color: "#4285f4",
  });
  report.checks.chromium_webview = await waitFor(
    () =>
      main.eval(
        `document.querySelector("#pageTitle")?.textContent === ${JSON.stringify(webQaTitle)}`,
      ),
    `Chromium webview did not load ${webQaUrl}`,
    45_000,
  );

  const drive = await findFixtureDrive(main);
  if (!drive) throw new Error("SIDEPAD_QA fixture disc was not found");
  report.fixture_drive = drive;

  for (const [extension, assertion] of [
    ["txt", 'document.querySelector(".text-document")?.textContent.includes("Windows x64")'],
    ["docx", 'document.querySelector(".docx-stage")?.textContent.includes("Windows x64 DOCX QA")'],
    ["pptx", 'document.querySelector(".pptx-stage")?.textContent.includes("Windows x64 PPTX QA")'],
    ["xlsx", 'document.querySelector(".sheet-table")?.textContent.includes("Sidepad Windows x64")'],
  ]) {
    await importFixture(main, drive, extension);
    report.checks[`${extension}_preview`] = await waitFor(
      () => main.eval(assertion),
      `${extension.toUpperCase()} preview did not render`,
      30_000,
    );
  }

  report.guest_report = await readGuestReport().catch(() => null);
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.stack ?? error.message;
} finally {
  main.close();
  edge.close();
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

if (report.status !== "passed") process.exitCode = 1;
