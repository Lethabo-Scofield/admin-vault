import { NextRequest, NextResponse } from "next/server";
import { ensureSchema, getSql } from "@/lib/db";

function authorised(request: NextRequest): boolean {
  const expected = process.env.OPS_SYNC_SECRET;
  const received = request.headers.get("x-ops-sync-secret");
  return Boolean(expected && received && received === expected);
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await ensureSchema();
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit") ?? 50), 1), 200);
  const sql = getSql();
  const rows = await sql<{
    id: string; eventKey: string; eventType: string; aggregateId: string;
    payload: unknown; attempts: number; createdAt: string;
  }[]>`
    select id, event_key as "eventKey", event_type as "eventType",
      aggregate_id as "aggregateId", payload, attempts, created_at as "createdAt"
    from ops_sync_events where status in ('PENDING', 'RETRY')
    order by created_at asc limit ${limit}
  `;
  return NextResponse.json({ events: rows });
}

export async function POST(request: NextRequest) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => null) as { eventKey?: string; status?: string; error?: string } | null;
  if (!body?.eventKey) return NextResponse.json({ error: "eventKey is required" }, { status: 400 });
  await ensureSchema();
  const status = body.status === "FAILED" ? "RETRY" : "PROCESSED";
  await getSql()`
    update ops_sync_events set status = ${status}, attempts = attempts + 1,
      last_error = ${body.error ?? ""}, processed_at = ${status === "PROCESSED" ? new Date() : null}
    where event_key = ${body.eventKey}
  `;
  return NextResponse.json({ ok: true, eventKey: body.eventKey, status });
}
