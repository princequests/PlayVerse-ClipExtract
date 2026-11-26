import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/;

function confirmationToken(html: string, cookieHeader: string | null): string | null {
  const cookieToken = cookieHeader?.match(/download_warning[^=;,]*=([^;]+)/)?.[1];
  if (cookieToken) return cookieToken;

  const inputToken = html.match(/name=["']confirm["'][^>]*value=["']([^"']+)["']/i)?.[1]
    ?? html.match(/value=["']([^"']+)["'][^>]*name=["']confirm["']/i)?.[1];
  if (inputToken) return inputToken;

  const linkToken = html.match(/[?&]confirm=([a-zA-Z0-9_-]+)/)?.[1];
  return linkToken ?? null;
}

async function fetchDrive(fileId: string, range: string | null, confirm?: string) {
  const url = new URL("https://drive.google.com/uc");
  url.searchParams.set("export", "download");
  url.searchParams.set("id", fileId);
  if (confirm) url.searchParams.set("confirm", confirm);

  return fetch(url, {
    headers: {
      ...(range ? { Range: range } : {}),
      "User-Agent": "Mozilla/5.0 PlayVerse media stream",
    },
    redirect: "follow",
    cache: "no-store",
  });
}

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("id") ?? "";
  if (!DRIVE_ID_PATTERN.test(fileId)) {
    return new Response("Invalid Google Drive file ID", { status: 400 });
  }

  const range = request.headers.get("range");
  let upstream: Response;

  try {
    upstream = await fetchDrive(fileId, range);
    const contentType = upstream.headers.get("content-type") ?? "";

    // Drive sometimes returns an HTML virus-scan/large-file confirmation page
    // instead of the media bytes. Follow its confirmation token server-side.
    if (contentType.includes("text/html")) {
      const html = await upstream.text();
      const token = confirmationToken(html, upstream.headers.get("set-cookie"));
      if (!token) {
        return new Response(
          "Google Drive did not return a media stream. Check that the file is public and downloadable.",
          { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } },
        );
      }
      upstream = await fetchDrive(fileId, range, token);
    }

    const finalType = upstream.headers.get("content-type") ?? "";
    if (!upstream.ok || finalType.includes("text/html") || !upstream.body) {
      return new Response("Google Drive could not provide playable video data.", {
        status: upstream.status >= 400 ? upstream.status : 502,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const headers = new Headers({
      "Content-Type": finalType || "video/mp4",
      "Cache-Control": "private, no-store",
      "Accept-Ranges": upstream.headers.get("accept-ranges") ?? "bytes",
      "X-Content-Type-Options": "nosniff",
    });

    for (const name of ["content-length", "content-range", "last-modified", "etag"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return new Response("Unable to stream this Google Drive file right now.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
