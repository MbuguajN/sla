import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const filePath = params.path.join("/");
  const fullPath = join(process.cwd(), "public", "uploads", filePath);

  if (!existsSync(fullPath)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const fileBuffer = await readFile(fullPath);
    
    // Determine content type based on extension
    const ext = filePath.split(".").pop()?.toLowerCase();
    let contentType = "application/octet-stream";
    
    if (ext === "png") contentType = "image/png";
    else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
    else if (ext === "gif") contentType = "image/gif";
    else if (ext === "svg") contentType = "image/svg+xml";
    else if (ext === "webp") contentType = "image/webp";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("SERVE_UPLOAD_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
