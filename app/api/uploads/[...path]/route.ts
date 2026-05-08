import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { extname, join, resolve, sep } from "path";
import { existsSync } from "fs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const UPLOADS_BASE_DIR = join(process.cwd(), "public", "uploads");

function getContentType(filePath: string) {
  const ext = extname(filePath).toLowerCase();

  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".webp") return "image/webp";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".txt") return "text/plain; charset=utf-8";
  if (ext === ".doc") return "application/msword";
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = params.path.join("/");

  const normalizedPath = filePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalizedPath || normalizedPath.includes("..")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const fullPath = resolve(UPLOADS_BASE_DIR, normalizedPath);
  const uploadsBaseResolved = resolve(UPLOADS_BASE_DIR);

  if (fullPath !== uploadsBaseResolved && !fullPath.startsWith(`${uploadsBaseResolved}${sep}`)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const isTaskResource = normalizedPath.startsWith("task-resources/");
  if (isTaskResource) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  }

  if (!existsSync(fullPath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(fullPath);

    const contentType = getContentType(normalizedPath);
    const cacheControl = isTaskResource
      ? "private, no-store"
      : "public, max-age=31536000, immutable";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": cacheControl,
      },
    });
  } catch (error) {
    console.error("SERVE_UPLOAD_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
