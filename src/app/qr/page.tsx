import { headers } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { config } from "@/lib/config";
import { getPackages, type Package } from "@/lib/vsco";

export const metadata = { title: "QR codes" };

async function siteUrl() {
  if (config.siteUrl) return config.siteUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Printable QR codes for the expo stand. Protected by ?key=ADMIN_PASSWORD.
 * One general code (couple picks a package) plus one per package (preselected).
 */
export default async function QrPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const { key } = await searchParams;
  if (!config.adminPassword || key !== config.adminPassword) notFound();

  const base = await siteUrl();
  let packages: Package[] = [];
  try {
    packages = await getPackages();
  } catch (err) {
    console.error("[qr] failed to load packages", err);
  }

  const codes = await Promise.all(
    [
      { label: "General (couple chooses a package)", url: `${base}/` },
      ...packages.map((p) => ({
        label: p.name,
        url: `${base}/?package=${encodeURIComponent(p.id)}`,
      })),
    ].map(async (c) => ({
      ...c,
      svg: await QRCode.toString(c.url, { type: "svg", margin: 1, width: 512 }),
      png: await QRCode.toDataURL(c.url, { margin: 2, width: 1024 }),
    })),
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold">QR codes</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Tap a code to download a high-resolution PNG for printing.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {codes.map((c) => (
          <Card key={c.url} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">{c.label}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <a
                href={c.png}
                download={`qr-${c.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.png`}
                className="block rounded-xl bg-white p-3 [&>svg]:h-auto [&>svg]:w-full"
                // The SVG is generated locally by the qrcode library from our own URL.
                dangerouslySetInnerHTML={{ __html: c.svg }}
              />
              <p className="text-xs break-all text-muted-foreground">{c.url}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
