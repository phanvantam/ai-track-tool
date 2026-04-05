import path from "node:path";

import type { BinaryFileInfo } from "../types.js";

const MAGIC_SIGNATURES: Array<{ bytes: number[]; type: BinaryFileInfo["type"] }> = [
  { bytes: [0xff, 0xd8, 0xff], type: "image" },
  { bytes: [0x89, 0x50, 0x4e, 0x47], type: "image" },
  { bytes: [0x47, 0x49, 0x46], type: "image" },
  { bytes: [0x25, 0x50, 0x44, 0x46], type: "document" },
  { bytes: [0x50, 0x4b, 0x03, 0x04], type: "archive" },
  { bytes: [0x7f, 0x45, 0x4c, 0x46], type: "executable" },
];

const EXTENSION_TYPES = new Map<string, BinaryFileInfo["type"]>([
  [".png", "image"],
  [".jpg", "image"],
  [".jpeg", "image"],
  [".gif", "image"],
  [".pdf", "document"],
  [".zip", "archive"],
  [".gz", "archive"],
  [".tar", "archive"],
  [".exe", "executable"],
  [".dll", "executable"],
  [".so", "executable"],
  [".bin", "other"],
]);

function matchesSignature(buffer: Buffer, signature: number[]): boolean {
  if (buffer.length < signature.length) {
    return false;
  }

  return signature.every((byte, index) => buffer[index] === byte);
}

export function detectBinaryContentInfo(filePath: string, content: Buffer): { isBinary: boolean; type?: BinaryFileInfo["type"] } {
  const extension = path.extname(filePath).toLowerCase();
  const extensionType = EXTENSION_TYPES.get(extension);

  for (const signature of MAGIC_SIGNATURES) {
    if (matchesSignature(content, signature.bytes)) {
      return {
        isBinary: true,
        type: signature.type,
      };
    }
  }

  if (extensionType) {
    return {
      isBinary: true,
      type: extensionType,
    };
  }

  if (content.includes(0)) {
    return {
      isBinary: true,
      type: "other",
    };
  }

  return {
    isBinary: false,
  };
}
