// An in-memory stand-in for the Supabase client: the query chains the
// Seminar Track code uses (select, eq, in, order, limit, single, insert,
// update) and rpc. Shared by the seminar tests.

function fakeDb(tables, rpcs = {}) {
  const calls = { rpc: [], inserts: [] };
  let idSeq = 0;
  function query(table) {
    const filters = []; let order = null; let lim = null; let op = 'select'; let payload = null; let single = false;
    const q = {
      select() { return q; },
      eq(k, v) { filters.push(r => r[k] === v); return q; },
      in(k, vs) { filters.push(r => vs.includes(r[k])); return q; },
      order(k, { ascending }) { order = { k, ascending }; return q; },
      limit(n) { lim = n; return q; },
      single() { single = true; return q; },
      insert(row) { op = 'insert'; payload = row; return q; },
      update(row) { op = 'update'; payload = row; return q; },
      then(resolve) {
        const rows = tables[table] || (tables[table] = []);
        let out;
        if (op === 'insert') {
          const row = { id: `t${++idSeq}`, is_active: false, review_notes: null, ...payload };
          rows.push(row); calls.inserts.push({ table, row }); out = [row];
        } else {
          out = rows.filter(r => filters.every(f => f(r)));
          if (op === 'update') out.forEach(r => Object.assign(r, payload));
          if (order) out = [...out].sort((a, b) => (a[order.k] > b[order.k] ? 1 : -1) * (order.ascending ? 1 : -1));
          if (lim) out = out.slice(0, lim);
        }
        resolve(single ? (out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } }) : { data: out, error: null });
      },
    };
    return q;
  }
  return {
    calls,
    from: query,
    rpc(name, args) {
      calls.rpc.push({ name, args });
      return Promise.resolve({ data: rpcs[name] ? rpcs[name](args) : null, error: null });
    },
  };
}

module.exports = { fakeDb };
