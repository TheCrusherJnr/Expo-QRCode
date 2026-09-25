import "server-only";
import { config } from "@/lib/config";

/**
 * Minimal client for the VSCO Workspace (formerly Táve) public API v2.
 * Spec: https://workspace.vsco.co/api/v2/openapi.json
 */

export class VscoApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "VscoApiError";
  }
}

async function vsco<T>(
  path: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
): Promise<T> {
  if (!config.vsco.apiKey) {
    throw new Error("VSCO_API_KEY is not set");
  }

  const res = await fetch(`${config.vsco.baseUrl}${path}`, {
    cache: init.next ? undefined : "no-store",
    ...init,
    headers: {
      "X-API-KEY": config.vsco.apiKey,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
  });

  const text = await res.text();
  const body = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new VscoApiError(
      `VSCO ${init.method ?? "GET"} ${path} failed with ${res.status}`,
      res.status,
      body,
    );
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorText(err: unknown) {
  return err instanceof VscoApiError
    ? `${err.message}: ${JSON.stringify(err.body)}`
    : String(err);
}

// ---------------------------------------------------------------------------
// Types (only the fields this app uses)

type Link = { href: string; managerHref?: string; clientHref?: string };
type Collection<T> = { items: T[]; meta?: { totalPages?: number } };

type LineItem = {
  productId?: string | null;
  name: string;
  descriptionHtml?: string | null;
  pricePerUnit?: number;
  costPerUnit?: number;
  units?: number;
  taxable?: boolean;
  discount?: boolean;
  discountValue?: boolean;
  discountKind?: "amount" | "percent";
  selectability?: "required" | "suggested" | "optional";
  selected?: boolean;
  children?: LineItem[] | null;
};

type QuoteOption = {
  id: string;
  name: string | null;
  lineItems: LineItem[];
  taxGroupId?: string | null;
  total?: number;
};

type Quote = {
  id: string;
  jobId: string;
  created: string;
  kind: "simple" | "advanced";
  name: string | null;
  introduction: string | null;
  status: "open" | "booked" | "closed";
  recipients?: Array<{ clientUrl?: string; lastSent?: string | null }>;
  options?: QuoteOption[];
};

type Job = {
  id: string;
  links?: { self?: Link };
  leadNotes?: string | null;
  closed?: boolean;
  externalMappings?: Array<{ id: string; url: string }> | null;
};

export type Package = {
  /** Option id inside the template quote. */
  id: string;
  name: string;
  /** In the studio's currency, whole units (VSCO stores cents). */
  price: number;
  inclusions: string[];
  extras: string[];
};

// ---------------------------------------------------------------------------
// Packages: the options of your template quote(s) in VSCO

async function getTemplateQuotes(): Promise<Quote[]> {
  const ids = config.vsco.templateQuoteIds;
  if (!ids.length) throw new Error("VSCO_TEMPLATE_QUOTE_IDS is not set");
  return Promise.all(
    ids.map((id) =>
      vsco<Quote>(`/quote/${id}`, { next: { revalidate: 300 } }),
    ),
  );
}

export async function getPackages(): Promise<Package[]> {
  const quotes = await getTemplateQuotes();
  return quotes.flatMap((q) =>
    (q.options ?? []).map((o) => {
      const required = o.lineItems.filter((i) => i.selectability !== "optional");
      const inclusions = required.flatMap((i) =>
        i.children?.length ? i.children.map((c) => c.name) : [i.name],
      );
      const extras = o.lineItems
        .filter((i) => i.selectability === "optional")
        .map((i) => i.name);
      return {
        id: o.id,
        name: o.name || q.name || "Package",
        price: Math.round((o.total ?? 0) / 100),
        inclusions,
        extras,
      };
    }),
  );
}

/** Deep-copies a line item, keeping only writable fields. */
function copyLineItem(i: LineItem): LineItem {
  return {
    productId: i.productId ?? null,
    name: i.name,
    descriptionHtml: i.descriptionHtml ?? null,
    pricePerUnit: i.pricePerUnit ?? 0,
    costPerUnit: i.costPerUnit ?? 0,
    units: i.units ?? 1,
    taxable: i.taxable ?? false,
    discount: i.discount ?? i.discountValue ?? false,
    discountKind: i.discountKind ?? "amount",
    selectability: i.selectability ?? "required",
    selected: i.selected ?? true,
    children: (i.children ?? []).map(copyLineItem),
  };
}

// ---------------------------------------------------------------------------
// Lead creation

type PersonInput = {
  firstName: string;
  lastName?: string;
  email?: string;
  phoneE164?: string;
};

export type CreatedLead = {
  jobId: string;
  managerUrl: string | null;
  quoteId: string | null;
  clientUrl: string | null;
  quoteError: string | null;
};

/** Marks jobs created by this app so the nightly email job can find them. */
export const EXPO_MARKER = "expo-qr";

function person(p: PersonInput) {
  return {
    kind: "person",
    firstName: p.firstName,
    lastName: p.lastName || null,
    email: p.email || null,
    cellPhone: p.phoneE164 ? { e164: p.phoneE164 } : null,
    contactPreference: p.email ? "email" : null,
  };
}

/**
 * Creates the lead in one transactional request (the Job Worksheet, which rolls
 * back on failure), then attaches a quote copied from the chosen template option.
 */
export async function createWeddingLead(input: {
  primary: PersonInput;
  partner: PersonInput;
  weddingDate: string; // YYYY-MM-DD
  packageId: string;
  notes?: string;
  siteUrl: string;
}): Promise<CreatedLead> {
  const { primary, partner, weddingDate } = input;

  const templates = await getTemplateQuotes();
  const template = templates.find((q) =>
    q.options?.some((o) => o.id === input.packageId),
  );
  const option = template?.options?.find((o) => o.id === input.packageId);
  if (!template || !option) throw new Error("Unknown package");

  const today = new Date().toISOString().slice(0, 10);
  const coupleName = `${primary.firstName} & ${partner.firstName}`;
  const packageName = option.name || template.name || "Package";

  const events = config.vsco.weddingEventTypeId
    ? [
        {
          name: "Wedding",
          typeId: config.vsco.weddingEventTypeId,
          startDate: weddingDate,
          endDate: weddingDate,
          allDay: true,
        },
      ]
    : [];

  const worksheet = await vsco<Job>("/job/-/worksheet", {
    method: "POST",
    body: JSON.stringify({
      name: `${coupleName} Wedding`,
      stage: "lead",
      webLead: true,
      eventDate: weddingDate,
      inquiryDate: today,
      jobTypeId: config.vsco.jobTypeId,
      leadSourceId: config.vsco.leadSourceId,
      leadStatusId: config.vsco.leadStatusId,
      brandId: config.vsco.brandId,
      externalMappings: [
        {
          id: `${EXPO_MARKER}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          url: input.siteUrl,
        },
      ],
      leadNotes: [
        "Signed up via the expo QR code form.",
        `Selected package: ${packageName}`,
        input.notes ? `\nNotes from the couple:\n${input.notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      contacts: [
        { client: true, attendingAllEvents: true, contact: person(primary) },
        { client: true, attendingAllEvents: true, contact: person(partner) },
      ],
      events,
    }),
  });

  const jobId = worksheet.id;
  const managerUrl = worksheet.links?.self?.managerHref ?? null;
  let quoteId: string | null = null;
  let clientUrl: string | null = null;
  let quoteError: string | null = null;

  // With VSCO_CREATE_QUOTE=false, a VSCO automation adds your quote template
  // (with its contract and payment schedule) instead of the app.
  if (!config.vsco.createQuote) {
    return { jobId, managerUrl, quoteId, clientUrl, quoteError };
  }

  try {
    const quote = await vsco<Quote>(`/job/${jobId}/quote`, {
      method: "POST",
      body: JSON.stringify({
        kind: "simple",
        name: template.name ? `${packageName} | ${template.name}` : packageName,
        introduction: template.introduction,
        // No expiry date on the quote.
        expiration: null,
        options: [
          {
            name: packageName,
            taxGroupId: option.taxGroupId ?? null,
            lineItems: option.lineItems.map(copyLineItem),
          },
        ],
      }),
    });
    quoteId = quote.id;
    clientUrl = quote.recipients?.find((r) => r.clientUrl)?.clientUrl ?? null;
  } catch (err) {
    // The job exists at this point, so the sign-up still counts.
    quoteError = errorText(err);
    console.error("[vsco] quote creation failed", quoteError);
  }

  return { jobId, managerUrl, quoteId, clientUrl, quoteError };
}

// ---------------------------------------------------------------------------
// Quote email: drafted (or sent) through VSCO's own mail system

export type QuoteEmailMode = "draft" | "send";

/**
 * Creates the quote email for the job's clients who have an email address, using
 * your default Quote Invite template and your connected mailbox.
 * "draft" saves it in VSCO for you to review and send. "send" emails it right away.
 */
export async function emailQuoteToClients(
  jobId: string,
  quoteId: string,
  mode: QuoteEmailMode,
): Promise<"done" | "no-email"> {
  // Only address clients who gave an email (the partner usually hasn't).
  const jobContacts = await vsco<
    Collection<{ contactId: string; client: boolean }>
  >(`/job-contact?jobId=${jobId}&pageSize=50`);
  const clients = await Promise.all(
    jobContacts.items
      .filter((c) => c.client)
      .map((c) =>
        vsco<{ id: string; email?: string | null }>(`/address-book/${c.contactId}`),
      ),
  );
  const recipientContactIds = clients
    .filter((c) => c.email)
    .map((c) => c.id)
    .slice(0, 5);
  if (!recipientContactIds.length) return "no-email";

  await vsco(`/quote/${quoteId}/send`, {
    method: "POST",
    body: JSON.stringify({
      resend: false,
      draft: mode === "draft",
      recipientContactIds,
      ...(config.vsco.quoteEmailTemplateId
        ? { mailMessageTemplateId: config.vsco.quoteEmailTemplateId }
        : {}),
    }),
  });
  return "done";
}
