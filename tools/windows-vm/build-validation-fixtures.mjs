#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import ExcelJS from "exceljs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";

const outputDir = path.resolve(".windows-vm/validation-fixtures");
const outputIso = path.resolve(".windows-vm/sidepad-validation-fixtures.iso");

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

await fs.writeFile(
  path.join(outputDir, "sample.txt"),
  "Sidepad Windows x64 text preview validation.\r\n",
  "utf8",
);

const workbook = new ExcelJS.Workbook();
const sheet = workbook.addWorksheet("QA");
sheet.addRow(["Name", "Status"]);
sheet.addRow(["Sidepad Windows x64", "Passed"]);
await workbook.xlsx.writeFile(path.join(outputDir, "sample.xlsx"));

const document = new Document({
  sections: [{
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: "Sidepad Windows x64 DOCX QA",
            bold: true,
          }),
        ],
      }),
      new Paragraph("Self-contained document preview test."),
    ],
  }],
});
await fs.writeFile(
  path.join(outputDir, "sample.docx"),
  await Packer.toBuffer(document),
);

const presentation = new PptxGenJS();
presentation.layout = "LAYOUT_WIDE";
const slide = presentation.addSlide();
slide.background = { color: "F5F1EA" };
slide.addText("Sidepad Windows x64 PPTX QA", {
  x: 1,
  y: 1.2,
  w: 10,
  h: 0.8,
  fontSize: 28,
  bold: true,
});
slide.addText("Self-contained slide preview test.", {
  x: 1,
  y: 2.2,
  w: 10,
  h: 0.5,
  fontSize: 16,
});
await presentation.writeFile({
  fileName: path.join(outputDir, "sample.pptx"),
});

await fs.rm(outputIso, { force: true });
await run("mkisofs", [
  "-J",
  "-R",
  "-V",
  "SIDEPAD_QA",
  "-o",
  outputIso,
  outputDir,
]);

console.log(outputIso);

function run(command, args) {
  const child = spawn(command, args, { stdio: "inherit" });
  return new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with status ${code}`));
    });
  });
}
