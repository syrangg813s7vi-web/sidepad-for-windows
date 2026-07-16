#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DATA="$ROOT/.windows-vm/Sidepad-Windows-11-x64.utm/Data"
MODE="${1:-single}"
QEMU="${QEMU_SYSTEM_X86_64:-/opt/homebrew/bin/qemu-system-x86_64}"

case "$MODE" in
  single)
    VIDEO_ARGS=(-device VGA,id=primary-vga)
    ;;
  dual-secondary)
    VIDEO_ARGS=(
      -device VGA,id=primary-vga
      -device secondary-vga,id=secondary-vga,xres=1280,yres=800
    )
    ;;
  dual-virtio)
    VIDEO_ARGS=(-device virtio-vga,id=virtio-vga,max_outputs=2,xres=1280,yres=800)
    ;;
  *)
    echo "Usage: $0 [single|dual-secondary|dual-virtio]" >&2
    exit 2
    ;;
esac

PIDFILE="$DATA/qemu-x64.pid"
if [[ -f "$PIDFILE" ]] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
  echo "The x64 validation VM is already running with PID $(cat "$PIDFILE")." >&2
  exit 1
fi

rm -f "$PIDFILE" "$DATA/qmp-direct.sock" "$DATA/qga.sock"

"$QEMU" \
  -name "Sidepad Windows 11 x64" \
  -machine q35,vmport=off \
  -accel tcg,thread=multi,tb-size=2048 \
  -cpu max \
  -smp cpus=8,sockets=1,cores=8,threads=1 \
  -m 8192 \
  -nodefaults \
  -rtc base=localtime \
  -boot order=c,menu=on \
  -drive if=pflash,format=raw,unit=0,file=/opt/homebrew/share/qemu/edk2-x86_64-code.fd,readonly=on \
  -drive if=pflash,format=raw,unit=1,file="$DATA/efi_vars.fd" \
  -drive if=none,media=disk,id=osdisk,file="$DATA/sidepad-windows.qcow2",discard=unmap,detect-zeroes=unmap \
  -device ide-hd,drive=osdisk,bus=ide.0,unit=0,bootindex=0 \
  -drive if=none,media=cdrom,id=wincd,file="$ROOT/.windows-vm/Win11_25H2_Enterprise_Eval_zh-cn_x64.verified.iso",readonly=on \
  -device ide-cd,drive=wincd,bus=ide.1,unit=0,bootindex=1 \
  -device qemu-xhci,id=usb-bus \
  -drive if=none,media=cdrom,id=testcd,file="$ROOT/.windows-vm/sidepad-verifier.iso",readonly=on \
  -device usb-storage,drive=testcd,removable=true,bus=usb-bus.0 \
  -drive if=none,media=disk,id=answer,file="$ROOT/.windows-vm/autounattend.img",readonly=on \
  -device usb-storage,drive=answer,removable=false,bus=usb-bus.0 \
  -drive if=none,media=cdrom,id=qafixture,file="$ROOT/.windows-vm/sidepad-validation-fixtures.iso",readonly=on \
  -device usb-storage,drive=qafixture,removable=true,bus=usb-bus.0 \
  -device virtio-serial-pci,id=virtio-serial0 \
  -chardev socket,path="$DATA/qga.sock",server=on,wait=off,id=qga0 \
  -device virtserialport,chardev=qga0,name=org.qemu.guest_agent.0,id=qga-port \
  "${VIDEO_ARGS[@]}" \
  -netdev user,id=net0,hostfwd=tcp:127.0.0.1:19222-:9222 \
  -device e1000e,netdev=net0 \
  -device usb-tablet,bus=usb-bus.0 \
  -qmp unix:"$DATA/qmp-direct.sock",server=on,wait=off \
  -vnc 127.0.0.1:2 \
  -display none \
  -daemonize \
  -pidfile "$PIDFILE" \
  -D "$DATA/qemu-x64.log"

echo "Started x64 validation VM in '$MODE' mode with PID $(cat "$PIDFILE")."
