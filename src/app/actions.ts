"use server";

import { headers } from "next/headers";
import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { config } from "@/lib/config";
import { inquirySchema, type InquiryInput } from "@/lib/schema";
import {
  createWeddingLead,
  getPackages,
  emailQuoteToClients,
  VscoApiError,
} from "@/lib/vsco";

export type SubmitResult =
  | { ok: true; firstName: string; packageName: string }
  | {
      ok: false;
      error: string;
      fieldErrors?: Partial<Record<keyof InquiryInput, string>>;
    };

async function siteUrl() {
  if (config.siteUrl) return config.siteUrl;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  // VSCO requires a real-looking URL on the job's external mapping.
  if (!host || host.startsWith("localhost")) return config.websiteUrl;
  return `${h.get("x-forwarded-proto") ?? "https"}://${host}/`;
}

export async function submitInquiry(input: InquiryInput): Promise<SubmitResult> {
  const parsed = inquirySchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Partial<Record<keyof InquiryInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof InquiryInput;
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const phone = parsePhoneNumberFromString(
    data.phone,
    config.defaultCountry as CountryCode,
  );
  if (!phone || !phone.isPossible()) {
    return {
      ok: false,
      error: "Please check the highlighted fields.",
      fieldErrors: { phone: "That phone number doesn't look right" },
    };
  }

  try {
    const pkg = (await getPackages()).find((p) => p.id === data.packageId);
    if (!pkg) {
      return {
        ok: false,
        error: "That package is no longer available. Please choose another.",
        fieldErrors: { packageId: "Please choose a package" },
      };
    }

    const lead = await createWeddingLead({
      primary: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneE164: phone.number,
      },
      partner: {
        firstName: data.partnerFirstName,
        lastName: data.partnerLastName || data.lastName,
      },
      weddingDate: data.weddingDate,
      packageId: pkg.id,
      notes: data.notes,
      siteUrl: await siteUrl(),
    });

    console.info("[inquiry] created", lead);

    if (lead.quoteId) {
      try {
        const result = await emailQuoteToClients(
          lead.jobId,
          lead.quoteId,
          config.quoteEmailMode,
        );
        console.info(`[inquiry] quote email ${config.quoteEmailMode}`, result);
      } catch (err) {
        // Not fatal: the lead and quote exist, so the email can be sent from VSCO by hand.
        console.error(
          "[inquiry] quote email failed",
          err instanceof VscoApiError ? { status: err.status, body: err.body } : err,
        );
      }
    }

    return { ok: true, firstName: data.firstName, packageName: pkg.name };
  } catch (err) {
    console.error(
      "[inquiry] failed",
      err instanceof VscoApiError ? { status: err.status, body: err.body } : err,
    );
    return {
      ok: false,
      error:
        "Sorry, something went wrong saving your details. Please try again or let us know in person.",
    };
  }
}
