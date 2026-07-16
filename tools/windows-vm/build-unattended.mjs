#!/usr/bin/env node

import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";

const sourceDir = path.resolve(
  process.env.WINDOWS_GUEST_TOOLS_DIR ?? "/Volumes/UTM Guest Tools",
);
const outputDir = path.resolve(".windows-vm/unattended");
const outputIso = path.resolve(".windows-vm/sidepad-unattended.iso");
const windowsArchitecture = process.env.WINDOWS_ARCH ?? "arm64";
if (!["amd64", "arm64"].includes(windowsArchitecture)) {
  throw new Error(`Unsupported Windows architecture: ${windowsArchitecture}`);
}
const sidepadInstaller = path.resolve(
  process.env.SIDEPAD_WINDOWS_INSTALLER ??
    (windowsArchitecture === "amd64"
      ? "dist/Sidepad Setup 0.1.0.exe"
      : "dist-arm64/Sidepad Setup 0.1.0.exe"),
);
const windowsImageIndex =
  process.env.WINDOWS_IMAGE_INDEX ?? (windowsArchitecture === "amd64" ? "1" : "3");
const windowsProductKey =
  process.env.WINDOWS_PRODUCT_KEY ?? "VK7JG-NPHTM-C97JM-9MPGT-3V66T";

await rm(outputDir, { recursive: true, force: true });
await mkdir(path.join(outputDir, "payload"), { recursive: true });
await cp(sourceDir, outputDir, { recursive: true });
await cp(sidepadInstaller, path.join(outputDir, "payload", "Sidepad-Setup.exe"));
await cp(
  path.resolve("tools/windows-vm/verify-sidepad.ps1"),
  path.join(outputDir, "payload", "verify-sidepad.ps1"),
);

const original = await readFile(
  path.join(outputDir, "Autounattend.xml"),
  "utf8",
);
let xml = original
  .replaceAll("W269N-WFGWX-YVC9B-4J6C9-T83GX", windowsProductKey)
  .replaceAll("<WillShowUI>Always</WillShowUI>", "<WillShowUI>OnError</WillShowUI>")
  .replaceAll("<UserData>", "<UserData>\n                <AcceptEula>true</AcceptEula>");
if (windowsProductKey.toLowerCase() === "none") {
  xml = xml.replaceAll(
    /<ProductKey>[\s\S]*?<\/ProductKey>/g,
    "",
  );
}

const setupMarker =
  `<component name="Microsoft-Windows-Setup" processorArchitecture="${windowsArchitecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">`;
xml = xml.replace(
  setupMarker,
  `<component name="Microsoft-Windows-International-Core-WinPE" processorArchitecture="${windowsArchitecture}" publicKeyToken="31bf3856ad364e35" language="neutral" versionScope="nonSxS">
            <SetupUILanguage><UILanguage>zh-CN</UILanguage></SetupUILanguage>
            <InputLocale>zh-CN</InputLocale>
            <SystemLocale>zh-CN</SystemLocale>
            <UILanguage>zh-CN</UILanguage>
            <UserLocale>zh-CN</UserLocale>
        </component>
        ${setupMarker}
            <DiskConfiguration>
                <Disk wcm:action="add">
                    <CreatePartitions>
                        <CreatePartition wcm:action="add"><Order>1</Order><Size>260</Size><Type>EFI</Type></CreatePartition>
                        <CreatePartition wcm:action="add"><Order>2</Order><Size>128</Size><Type>MSR</Type></CreatePartition>
                        <CreatePartition wcm:action="add"><Extend>true</Extend><Order>3</Order><Type>Primary</Type></CreatePartition>
                    </CreatePartitions>
                    <ModifyPartitions>
                        <ModifyPartition wcm:action="add"><Format>FAT32</Format><Label>System</Label><Order>1</Order><PartitionID>1</PartitionID></ModifyPartition>
                        <ModifyPartition wcm:action="add"><Format>NTFS</Format><Label>Windows</Label><Letter>C</Letter><Order>2</Order><PartitionID>3</PartitionID></ModifyPartition>
                    </ModifyPartitions>
                    <DiskID>0</DiskID>
                    <WillWipeDisk>true</WillWipeDisk>
                </Disk>
                <WillShowUI>OnError</WillShowUI>
            </DiskConfiguration>
            <ImageInstall>
                <OSImage>
                    <InstallFrom><MetaData wcm:action="add"><Key>/IMAGE/INDEX</Key><Value>${windowsImageIndex}</Value></MetaData></InstallFrom>
                    <InstallTo><DiskID>0</DiskID><PartitionID>3</PartitionID></InstallTo>
                    <WillShowUI>OnError</WillShowUI>
                </OSImage>
            </ImageInstall>`,
);

const shellMarker =
  `<component name="Microsoft-Windows-Shell-Setup" processorArchitecture="${windowsArchitecture}"`;
const oobeStart = xml.lastIndexOf(shellMarker);
const oobeEnd = xml.indexOf("</component>", oobeStart);
if (oobeStart < 0 || oobeEnd < 0) {
  throw new Error(
    `Could not find the ${windowsArchitecture} oobeSystem Shell-Setup component.`,
  );
}
const oobeComponent = xml
  .slice(oobeStart, oobeEnd + "</component>".length)
  .replace(
    "<OOBE>",
    `<TimeZone>China Standard Time</TimeZone>
            <AutoLogon>
                <Password><Value>SidepadTest!2026</Value><PlainText>true</PlainText></Password>
                <Enabled>true</Enabled><LogonCount>2</LogonCount><Username>sidepad</Username>
            </AutoLogon>
            <UserAccounts>
                <LocalAccounts>
                    <LocalAccount wcm:action="add">
                        <Password><Value>SidepadTest!2026</Value><PlainText>true</PlainText></Password>
                        <Description>Sidepad verification account</Description>
                        <DisplayName>Sidepad Test</DisplayName><Group>Administrators</Group><Name>sidepad</Name>
                    </LocalAccount>
                </LocalAccounts>
            </UserAccounts>
            <OOBE>
                <HideEULAPage>true</HideEULAPage>
                <HideLocalAccountScreen>true</HideLocalAccountScreen>`,
  )
  .replace(
    /<FirstLogonCommands>[\s\S]*?<\/FirstLogonCommands>/,
    `<FirstLogonCommands>
                <SynchronousCommand wcm:action="add"><Order>1</Order><Description>Disable hibernation</Description><CommandLine>cmd /c powercfg -h off</CommandLine></SynchronousCommand>
                <SynchronousCommand wcm:action="add"><Order>2</Order><Description>Install UTM guest tools</Description><CommandLine>cmd /c for %i in (D E F G H) do if exist "%i:\\utm-guest-tools-0.1.271.exe" start /wait "" "%i:\\utm-guest-tools-0.1.271.exe" /S</CommandLine></SynchronousCommand>
                <SynchronousCommand wcm:action="add"><Order>3</Order><Description>Install Sidepad</Description><CommandLine>cmd /c for %i in (D E F G H) do if exist "%i:\\payload\\Sidepad-Setup.exe" start /wait "" "%i:\\payload\\Sidepad-Setup.exe" /S</CommandLine></SynchronousCommand>
                <SynchronousCommand wcm:action="add"><Order>4</Order><Description>Verify Sidepad</Description><CommandLine>cmd /c for %i in (D E F G H) do if exist %i:\\payload\\verify-sidepad.ps1 powershell.exe -NoProfile -ExecutionPolicy Bypass -File %i:\\payload\\verify-sidepad.ps1</CommandLine></SynchronousCommand>
            </FirstLogonCommands>`,
  );
xml =
  xml.slice(0, oobeStart) +
  oobeComponent +
  xml.slice(oobeEnd + "</component>".length);

await writeFile(path.join(outputDir, "Autounattend.xml"), xml, "utf8");
await rm(outputIso, { force: true });
await run("mkisofs", [
  "-J",
  "-R",
  "-V",
  "SIDEPAD_TEST",
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
