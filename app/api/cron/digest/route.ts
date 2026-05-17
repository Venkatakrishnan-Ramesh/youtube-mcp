import { getDigestEventsForDay, getPreviousDayKey } from "@/lib/digest-log";
import { sendDigestEmail } from "@/lib/email";

export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const isCron = request.headers.get("x-vercel-cron") === "1";
  const bearer = request.headers.get("authorization");
  const allowManual = bearer && bearer === `Bearer ${process.env.MCP_BEARER_TOKEN}`;

  if (!isCron && !allowManual) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dayKey = getPreviousDayKey();
  const events = await getDigestEventsForDay(dayKey);

  if (events.length === 0) {
    return Response.json({
      ok: true,
      sent: false,
      reason: "No events found for previous day.",
      dayKey
    });
  }

  await sendDigestEmail(dayKey, events);

  return Response.json({
    ok: true,
    sent: true,
    dayKey,
    count: events.length
  });
}
