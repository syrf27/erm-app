import { del, get, put } from "@vercel/blob";
import { existsSync } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { basename, extname, resolve } from "path";

export type StorageDriver = "local" | "vercel-blob";

export interface StoredFile {
  url: string;
  pathname?: string;
}

interface UploadFileInput {
  buffer: Buffer;
  filename: string;
  contentType?: string;
}

const LOCAL_UPLOADS_DIR = resolve(process.cwd(), "uploads");
const BLOB_UPLOAD_PREFIX = "uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".csv": "text/csv",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".txt": "text/plain",
};

export function getStorageDriver(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER || "local";

  if (driver === "local" || driver === "vercel-blob") {
    return driver;
  }

  throw new Error(`Unsupported STORAGE_DRIVER "${driver}". Use "local" or "vercel-blob".`);
}

export function getContentTypeFromFilename(filename: string): string {
  return CONTENT_TYPES[getStorageExtension(filename)] || "application/octet-stream";
}

export function getStorageExtension(location: string): string {
  const withoutQuery = location.split("?")[0] || location;
  return extname(withoutQuery).toLowerCase();
}

export function isLocalUploadUrl(location: string): boolean {
  return location.startsWith("/api/uploads/") || location.startsWith("/uploads/") || location.startsWith("uploads/");
}

export function isVercelBlobUrl(location: string): boolean {
  try {
    return new URL(location).hostname.endsWith(".blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export function isManagedUploadUrl(location: string): boolean {
  return isLocalUploadUrl(location) || isVercelBlobUrl(location);
}

function getLocalFilename(location: string): string {
  const filename = location.replace(/^\/api\/uploads\//, "").replace(/^\/uploads\//, "").replace(/^uploads\//, "");
  return basename(filename);
}

function getUploadPathname(location: string): string {
  if (isVercelBlobUrl(location)) {
    const url = new URL(location);
    return url.pathname.replace(/^\/+/, "");
  }

  return `${BLOB_UPLOAD_PREFIX}/${getLocalFilename(location)}`;
}

function getLocalPath(filename: string): string {
  const safeFilename = basename(filename);
  const filePath = resolve(LOCAL_UPLOADS_DIR, safeFilename);

  if (!filePath.startsWith(`${LOCAL_UPLOADS_DIR}/`) && filePath !== LOCAL_UPLOADS_DIR) {
    throw new Error("Invalid upload path");
  }

  return filePath;
}

export async function uploadFile({ buffer, filename, contentType }: UploadFileInput): Promise<StoredFile> {
  const safeFilename = basename(filename);
  const driver = getStorageDriver();

  if (driver === "local") {
    await mkdir(LOCAL_UPLOADS_DIR, { recursive: true });
    await writeFile(getLocalPath(safeFilename), buffer);

    return {
      url: `/api/uploads/${safeFilename}`,
      pathname: `uploads/${safeFilename}`,
    };
  }

  const pathname = `${BLOB_UPLOAD_PREFIX}/${safeFilename}`;
  const blob = await put(pathname, buffer, {
    access: "private",
    addRandomSuffix: false,
    contentType: contentType || getContentTypeFromFilename(safeFilename),
  });

  return {
    url: `/api/uploads/${safeFilename}`,
    pathname: blob.pathname,
  };
}

export async function readFileFromStorage(location: string): Promise<Buffer> {
  if (isLocalUploadUrl(location) && getStorageDriver() === "local") {
    const filePath = getLocalPath(getLocalFilename(location));

    if (!existsSync(filePath)) {
      throw new Error("File not found");
    }

    return readFile(filePath);
  }

  if (isLocalUploadUrl(location) || isVercelBlobUrl(location)) {
    const blob = await get(getUploadPathname(location), {
      access: "private",
      useCache: false,
    });

    if (!blob || blob.statusCode !== 200 || !blob.stream) {
      throw new Error("File not found");
    }

    return Buffer.from(await new Response(blob.stream).arrayBuffer());
  }

  const response = await fetch(location);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function deleteFile(location: string): Promise<void> {
  if (!isManagedUploadUrl(location)) {
    return;
  }

  if (isLocalUploadUrl(location) && getStorageDriver() === "local") {
    try {
      await unlink(getLocalPath(getLocalFilename(location)));
    } catch (error: any) {
      if (error?.code !== "ENOENT") {
        throw error;
      }
    }
    return;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.VERCEL_OIDC_TOKEN) {
    console.warn("Skipping Vercel Blob delete because no Blob server token is configured.");
    return;
  }

  await del(getUploadPathname(location));
}
