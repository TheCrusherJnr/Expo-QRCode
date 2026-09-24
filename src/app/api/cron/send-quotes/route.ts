import { config } from "@/lib/config";
import { sendPendingQuotes } from "@/lib/vsco";

/**
 * Nightly job (see vercel.json): emails each new expo couple their quote through
 * VSCO Workspace, using your connected mailbox and the Quote Invite template.
 *
 * Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`.
 * Add `?dryRun=1` to list what would be sent without sending anything.
 */
export async function GET(request: Request) {
  if (
    !config.cronSecret ||
    request.headers.get("authorization") !== `Bearer ${config.cronSecret}`
  ) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const report = await sendPendingQuotes({ dryRun });
    console.info("[cron] send-quotes", { dryRun, ...report });
    return Response.json({ dryRun, ...report });
  } catch (err) {
    console.error("[cron] send-quotes failed", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
