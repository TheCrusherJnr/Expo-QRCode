# Forever In Frame: expo QR sign-up

A mobile-first Next.js + shadcn/ui form that couples reach by scanning a QR code.
When they submit:

1. **Lead created in VSCO Workspace (Táve).** One transactional request creates the
   job with both partners as clients, the wedding date, a "Wedding" calendar event,
   job type, brand, lead source and lead status. The job is tagged as an expo lead.
2. **Quote attached.** The package options come from a template quote in VSCO
   (`VSCO_TEMPLATE_QUOTE_IDS`). The couple's quote is a copy of the option they
   picked, with your intro text, line items, prices and optional extras.
3. **Quote email drafted in VSCO.** A draft addressed to the couple is saved on
   the job, using your default "Quote Invitation" email template and your connected
   mailbox. You review it in VSCO and press send. Set `QUOTE_EMAIL_MODE=send` to
   email couples straight away instead.

## Setup

```bash
npm install
cp .env.example .env.local     # then fill it in
npm run vsco:setup             # lists brands, job types, lead sources, event types and quotes
npm run dev
```

Your brand needs a sender under **Settings › Mail Settings › Default From Addresses**,
otherwise VSCO can't create the email.

## Changing packages

Edit the template quote in VSCO, or point `VSCO_TEMPLATE_QUOTE_IDS` at a
different quote. The form picks up changes within 5 minutes.

## QR codes

Open `/qr?key=ADMIN_PASSWORD` on the deployed site. It shows one general code
plus one code per package, which opens the form with that package selected.
Tap a code to download a print-quality PNG. Set `NEXT_PUBLIC_SITE_URL` so the
codes point at your real domain.

## Deploy

Deploy to Vercel and add every variable from `.env.local` in the project settings.
