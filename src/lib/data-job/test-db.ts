// A stand-in for the Supabase client, for the data job's failure tests (run.test.ts, remember.test.ts).
// Every query is recorded, and a test decides what each one answers. Filters are recorded, not applied:
// each test answers with exactly the rows it wants the job to see.

export type DbOp = "select" | "insert" | "upsert" | "update" | "delete";
export type DbCall = { table: string; op: DbOp; payload?: unknown; filters: [string, unknown[]][] };
export type DbAnswer = { data?: unknown; error?: { message: string } | null; count?: number | null };

const FILTERS = ["eq", "neq", "in", "is", "not", "gt", "gte", "lt", "lte", "order", "limit", "maybeSingle", "single", "select"];

export function fakeDb(answer: (call: DbCall) => DbAnswer | undefined) {
  const calls: DbCall[] = [];
  const from = (table: string) => {
    const call: DbCall = { table, op: "select", filters: [] };
    calls.push(call);
    const builder: Record<string, unknown> = {};
    for (const op of ["insert", "upsert", "update", "delete"] as const) {
      builder[op] = (payload?: unknown) => {
        call.op = op;
        call.payload = payload;
        return builder;
      };
    }
    for (const f of FILTERS) {
      builder[f] = (...args: unknown[]) => {
        call.filters.push([f, args]);
        return builder;
      };
    }
    // Awaiting the query answers it, like the real client.
    builder.then = (resolve: (v: DbAnswer) => unknown, reject?: (e: unknown) => unknown) => {
      try {
        const a = answer(call) ?? {};
        return Promise.resolve(resolve({ data: a.data ?? null, error: a.error ?? null, count: a.count ?? null }));
      } catch (e) {
        return reject ? Promise.resolve(reject(e)) : Promise.reject(e);
      }
    };
    return builder;
  };
  return { client: { from }, calls };
}

/** The writes a test made to one table, e.g. every `update` on "readings". */
export function writes(calls: DbCall[], table: string, op: DbOp): unknown[] {
  return calls.filter((c) => c.table === table && c.op === op).map((c) => c.payload);
}
