#!/usr/bin/env node

import { randomUUID } from "node:crypto";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const vmPath = path.resolve(
  process.env.WINDOWS_VM_PATH ?? ".windows-vm/Sidepad-Windows-11.utm",
);
const architecture = process.env.WINDOWS_VM_ARCH ?? "aarch64";
if (!["aarch64", "x86_64"].includes(architecture)) {
  throw new Error(`Unsupported VM architecture: ${architecture}`);
}
const isX64 = architecture === "x86_64";
const windowsIso = path.resolve(
  process.env.WINDOWS_ISO ??
    (isX64
      ? ".windows-vm/26100.1_PROFESSIONAL_X64_ZH-CN.ISO"
      : ".windows-vm/windows-11-arm64.iso"),
);
const unattendedIso = path.resolve(
  process.env.WINDOWS_UNATTENDED_ISO ?? ".windows-vm/sidepad-unattended.iso",
);
const answerDrive = path.resolve(
  process.env.WINDOWS_ANSWER_DRIVE ?? ".windows-vm/autounattend.img",
);
const memoryMib = Number(process.env.WINDOWS_VM_MEMORY ?? 8192);
const cpuCount = Number(process.env.WINDOWS_VM_CPUS ?? 8);
const diskGib = Number(process.env.WINDOWS_VM_DISK_GIB ?? 80);
const vmName =
  process.env.WINDOWS_VM_NAME ??
  (isX64 ? "Sidepad Windows 11 x64" : "Sidepad Windows 11");

const dataPath = path.join(vmPath, "Data");
await rm(vmPath, { recursive: true, force: true });
await mkdir(dataPath, { recursive: true });

const diskName = "sidepad-windows.qcow2";
const windowsIsoName = isX64 ? "windows-11-x64.iso" : "windows-11-arm64.iso";
const unattendedIsoName = "sidepad-unattended.iso";
const answerDriveName = "autounattend.img";

await Promise.all([
  copyFile(windowsIso, path.join(dataPath, windowsIsoName)),
  copyFile(unattendedIso, path.join(dataPath, unattendedIsoName)),
  copyFile(answerDrive, path.join(dataPath, answerDriveName)),
  copyFile(
    isX64
      ? "/Applications/UTM.app/Contents/Resources/qemu/edk2-i386-vars.fd"
      : "/Applications/UTM.app/Contents/Resources/qemu/edk2-arm-secure-vars.fd",
    path.join(dataPath, "efi_vars.fd"),
  ),
]);
await mkdir(path.join(dataPath, "tpmdata"), { recursive: true });

await run("qemu-img", [
  "create",
  "-f",
  "qcow2",
  path.join(dataPath, diskName),
  `${diskGib}G`,
]);

const drive = (imageName, imageType, interfaceName, readOnly) => ({
  Identifier: randomUUID().toUpperCase(),
  ImageName: imageName,
  ImageType: imageType,
  Interface: interfaceName,
  InterfaceVersion: 1,
  ReadOnly: readOnly,
});

const config = {
  Backend: "QEMU",
  ConfigurationVersion: 4,
  Information: {
    Icon: "windows",
    IconCustom: false,
    Name: vmName,
    Notes: isX64
      ? "Windows 11 x64 emulation environment for final Sidepad verification."
      : "Windows 11 ARM64 compatibility precheck environment for Sidepad.",
    UUID: randomUUID().toUpperCase(),
  },
  System: {
    Architecture: architecture,
    CPU: "default",
    CPUCount: cpuCount,
    CPUFlagsAdd: [],
    CPUFlagsRemove: [],
    ForceMulticore: false,
    JITCacheSize: 0,
    MemorySize: memoryMib,
    Target: isX64 ? "q35" : "virt",
  },
  QEMU: {
    AdditionalArguments: [
      "-qmp unix:qmp.sock,server=on,wait=off",
    ],
    BalloonDevice: true,
    DebugLog: true,
    Hypervisor: !isX64,
    PS2Controller: isX64,
    RNGDevice: true,
    RTCLocalTime: true,
    // The unattended media already applies Microsoft's LabConfig bypass.
    // Disabling UTM's software TPM avoids swtpm initialization failures on
    // newer macOS hosts while preserving a reproducible Windows test VM.
    TPMDevice: false,
    TSO: false,
    UEFIBoot: true,
  },
  Input: {
    MaximumUsbShare: 3,
    UsbBusSupport: "3.0",
    UsbSharing: false,
  },
  Sharing: {
    ClipboardSharing: true,
    DirectoryShareMode: "WebDAV",
    DirectoryShareReadOnly: false,
  },
  Display: [
    {
      DownscalingFilter: "Linear",
      DynamicResolution: true,
      Hardware: isX64 ? "qxl-vga" : "virtio-ramfb",
      NativeResolution: false,
      UpscalingFilter: "Nearest",
    },
  ],
  Drive: [
    drive(diskName, "Disk", isX64 ? "SATA" : "NVMe", false),
    drive(windowsIsoName, "CD", isX64 ? "IDE" : "USB", true),
    drive(unattendedIsoName, "CD", isX64 ? "IDE" : "USB", true),
    drive(answerDriveName, "Disk", "USB", true),
  ],
  Network: [
    {
      Hardware: isX64 ? "e1000" : "virtio-net-pci",
      IsolateFromHost: false,
      MacAddress: randomMacAddress(),
      Mode: "Emulated",
      PortForward: [],
    },
  ],
  Serial: [],
  Sound: [{ Hardware: "intel-hda" }],
};

await writeFile(
  path.join(vmPath, "config.plist"),
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n` +
    `<plist version="1.0">\n${toPlist(config, 1)}\n</plist>\n`,
  "utf8",
);

console.log(vmPath);

function randomMacAddress() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  bytes[0] = (bytes[0] | 0x02) & 0xfe;
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(":");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toPlist(value, depth) {
  const indent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    const items = value.map((item) => toPlist(item, depth + 1)).join("\n");
    return `${indent}<array>${items ? `\n${items}\n${indent}` : ""}</array>`;
  }
  if (value && typeof value === "object") {
    const items = Object.entries(value)
      .map(
        ([key, item]) =>
          `${"  ".repeat(depth + 1)}<key>${escapeXml(key)}</key>\n${toPlist(item, depth + 1)}`,
      )
      .join("\n");
    return `${indent}<dict>${items ? `\n${items}\n${indent}` : ""}</dict>`;
  }
  if (typeof value === "boolean") {
    return `${indent}<${value ? "true" : "false"}/>`;
  }
  if (typeof value === "number") {
    return `${indent}<integer>${value}</integer>`;
  }
  return `${indent}<string>${escapeXml(value)}</string>`;
}

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
