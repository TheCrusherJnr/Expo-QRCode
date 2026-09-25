import Image from "next/image";
import { ArrowUpRightIcon } from "lucide-react";
import { InquiryForm } from "@/components/inquiry-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { config } from "@/lib/config";
import { getPackages, type Package } from "@/lib/vsco";
import logo from "../../public/logo.png";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ package?: string }>;
}) {
  const { package: preselected } = await searchParams;

  let packages: Package[] = [];
  let loadError = false;
  try {
    packages = await getPackages();
  } catch (err) {
    console.error("[home] failed to load packages", err);
    loadError = true;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="mb-7 flex flex-col items-center text-center">
        <a
          href={config.websiteUrl}
          target="_blank"
          rel="noopener"
          aria-label={`${config.studioName} website`}
          className="block w-60 max-w-[75%] py-2"
        >
          <Image src={logo} alt={config.studioName} priority className="h-auto w-full" />
        </a>
        <h1 className="mt-5 font-heading text-[2.1rem] leading-tight font-semibold tracking-tight text-balance">
          Let&apos;s capture your wedding day
        </h1>
        <p className="mt-2 text-base text-muted-foreground text-pretty">
          Pop in your details and we&apos;ll email you your booking form.
        </p>
      </header>

      {loadError || packages.length === 0 ? (
        <Alert variant="destructive">
          <AlertTitle>We can&apos;t load our packages right now</AlertTitle>
          <AlertDescription>
            Please let us know in person and we&apos;ll get you sorted.
          </AlertDescription>
        </Alert>
      ) : (
        <InquiryForm
          packages={packages}
          defaultPackageId={
            packages.some((p) => p.id === preselected) ? preselected : undefined
          }
          showPrices={config.showPrices}
          currency={config.currency}
          filmsUrl={config.filmsUrl}
        />
      )}

      <a
        href={config.filmsUrl}
        target="_blank"
        rel="noopener"
        className="group mt-8 flex items-center justify-between gap-4 rounded-2xl border border-gold/60 bg-card px-5 py-4 transition-colors active:bg-accent"
      >
        <span>
          <span className="block font-heading text-xl font-semibold">
            View more of our work
          </span>
          <span className="block text-sm text-muted-foreground">
            Films, packages and the team behind the camera
          </span>
        </span>
        <ArrowUpRightIcon
          className="size-5 shrink-0 text-gold-deep transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          aria-hidden
        />
      </a>

      <footer className="mt-6 text-center text-xs text-muted-foreground">
        <a href={config.websiteUrl} target="_blank" rel="noopener" className="underline-offset-4 hover:underline">
          {new URL(config.websiteUrl).host.replace(/^www\./, "")}
        </a>
      </footer>
    </main>
  );
}
