import "server-only";

function optional(name: string, fallback = ""): string {
  const value = process.env[name];
  return value && value.trim() !== "" ? value.trim() : fallback;
}

function list(name: string): string[] {
  return optional(name)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export const config = {
  studioName: optional("STUDIO_NAME", "Forever In Frame"),
  websiteUrl: optional("WEBSITE_URL", "https://foreverinframe.com.au/"),
  filmsUrl: optional("FILMS_URL", "https://foreverinframe.com.au/"),

  vsco: {
    apiKey: optional("VSCO_API_KEY"),
    baseUrl: optional("VSCO_API_BASE_URL", "https://workspace.vsco.co/api/v2"),
    // Quote(s) whose options are offered as packages on the form.
    templateQuoteIds: list("VSCO_TEMPLATE_QUOTE_IDS"),
    jobTypeId: optional("VSCO_JOB_TYPE_ID") || null,
    leadSourceId: optional("VSCO_LEAD_SOURCE_ID") || null,
    leadStatusId: optional("VSCO_LEAD_STATUS_ID") || null,
    brandId: optional("VSCO_BRAND_ID") || null,
    weddingEventTypeId: optional("VSCO_WEDDING_EVENT_TYPE_ID") || null,
    // true: the app copies the chosen package into a quote and drafts the email.
    // false: the app only creates the lead; a VSCO automation adds your quote
    // template (contract, payment schedule) and drafts the email.
    createQuote: optional("VSCO_CREATE_QUOTE", "true") === "true",
    // Optional: a specific VSCO email template for the quote email (ULID).
    quoteEmailTemplateId: optional("VSCO_QUOTE_EMAIL_TEMPLATE_ID") || null,
  },

  // "draft": save the quote email as a draft in VSCO for you to review and send.
  // "send": email it to the couple straight away.
  quoteEmailMode: (optional("QUOTE_EMAIL_MODE", "draft") === "send" ? "send" : "draft") as
    | "draft"
    | "send",
  // Name shown on the form when there's only one package.
  packageName: optional("PACKAGE_NAME", "Expo Promo"),
  defaultCountry: optional("DEFAULT_PHONE_COUNTRY", "AU").toUpperCase(),
  currency: optional("CURRENCY", "AUD"),
  showPrices: optional("SHOW_PRICES", "true") === "true",
  adminPassword: optional("ADMIN_PASSWORD"),
  siteUrl: optional("NEXT_PUBLIC_SITE_URL"),
};
