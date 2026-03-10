import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

function sanitizeSegment(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/(^-|-$)/g, "");
}

export class AssetStorageService {
  static async saveBase64Image(input: {
    base64Data: string;
    extension?: "jpeg" | "png" | "webp";
    fileName: string;
    folderSegments: string[];
  }) {
    const extension = input.extension ?? "png";
    const safeSegments = input.folderSegments.map((segment) => sanitizeSegment(segment)).filter(Boolean);
    const safeFileName = sanitizeSegment(input.fileName) || "asset";
    const relativeDirectory = path.posix.join("generated", ...safeSegments);
    const relativeUrl = `/${path.posix.join(relativeDirectory, `${safeFileName}.${extension}`)}`;
    const absolutePath = path.join(process.cwd(), "public", relativeDirectory, `${safeFileName}.${extension}`);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, Buffer.from(input.base64Data, "base64"));

    return {
      path: absolutePath,
      url: relativeUrl,
    };
  }
}
