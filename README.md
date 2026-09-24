# Forever In Frame: expo QR sign-up

A mobile-first Next.js + shadcn/ui form that couples reach by scanning a QR code.
When they submit:

1. **Lead created in VSCO Workspace (Táve).** One transactional request creates the
   job with both partners as clients, the wedding date, a "Wedding" calendar event,
   job type, brand, lead source and lead status. The job is tagged as an expo lead.
2. **Quote attached.** The package options come from a template quote in VSCO
   (`VSCO_TEMPLATE_QUOTE_IDS`). The couple's quote is a copy of the option they
   picked, with your intro text, line items, prices and optional extras.
3. **Quote emailed that night through VSCO.** A nightly job at 8pm Brisbane time
   sends each new expo quote with your Quote Invite email template, from the
   mailbox connected to VSCO. Sends show up in the job's mail history. VSCO blocks
   a second send, so a quote is never emailed twice.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run vsco:setup             # lists brands, job types, lead sources, event types and quotes
npm run dev
```

Before the nightly email can send, set a sender for the brand in VSCO under
**Settings › Mail Settings › Default From Addresses**. Without it, VSCO returns
"No active mail sender is configured for this studio/brand."

To see what tonight's run would send without sending anything:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/send-quotes?dryRun=1"
```

Leave out `?dryRun=1` to send for real.

## Changing packages

Edit the template quote in VSCO, or point `VSCO_TEMPLATE_QUOTE_IDS` at a
different quote. The form picks up changes within 5 minutes.

## QR codes

Open `/qr?key=ADMIN_PASSWORD` on the deployed site. It shows one general code
plus one code per package, which opens the form with that package selected.
Tap a code to download a print-quality PNG. Set `NEXT_PUBLIC_SITE_URL` so the
codes point at your real domain.

## Deploy

Deploy to Vercel and add every variable from `.env.local` in the project
settings, including `CRON_SECRET`. `vercel.json` schedules the nightly send at
10:00 UTC, which is 8pm in Brisbane.
