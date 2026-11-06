// =============================================================================
// Patel's Cafe API — Cloudflare Worker (Hono)
//
// Multi-cafe isolation rules (enforced on EVERY route):
//   * The caller's cafe and role come only from the `user_roles` table.
//     Nothing sent by the client can change which cafe a request touches.
//   * Every query filters by `cafe_id = <caller's cafe>`; ids from the URL or
//     body are always re-checked against that cafe.
//   * Roles: owner (everything) · counter (floor, orders, menu) · cook (kitchen).
//
// Secrets (wrangler secret put / .dev.vars):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional vars:
//   APP_URL          — frontend URL used in invite e-mails (falls back to Origin)
//   ALLOWED_ORIGINS  — comma-separated CORS allow-list (default: any origin)
// =============================================================================
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

// -----------------------------------------------------------------------------
// Constants — keep MENU_CATEGORIES in sync with MenuItem['category'] in src/types.ts
// -----------------------------------------------------------------------------
const ROLES = ['owner', 'counter', 'cook'];
const ORDER_STATUSES = ['pending', 'preparing', 'ready', 'served', 'paid'];
const COOK_ORDER_STATUSES = ['preparing', 'ready'];
const TABLE_STATUSES = ['available', 'occupied'];
const MENU_CATEGORIES = [
  'sandwich', 'slice', 'pizza', 'maggi', 'milkshake', 'puff', 'bhel',
  'fries', 'burger', 'tea-coffee', 'thepla-paratha', 'extra',
];
const DIETARY = ['Vegan', 'GF'];
const DEFAULT_SETTINGS = { storeName: '', taxRate: 0.05, currency: '₹' };
const WALK_IN_PREFIX = 'walk-in-';
const ID_RE = /^[A-Za-z0-9_-]{1,100}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// -----------------------------------------------------------------------------
// Small helpers
// -----------------------------------------------------------------------------
const fail = (status, message) => {
  throw new HTTPException(status, { message });
};

/** Unwrap a supabase-js result, throwing on error. */
const unwrap = ({ data, error }) => {
  if (error) throw error;
  return data;
};

const newId = (prefix) => `${prefix}-${crypto.randomUUID()}`;
const round2 = (n) => Math.round(n * 100) / 100;
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

const readJson = async (c) => {
  try {
    const body = await c.req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
};

const idParam = (c, name = 'id') => {
  const value = c.req.param(name);
  if (!ID_RE.test(value || '')) fail(400, `Invalid ${name}.`);
  return value;
};

const text = (value, field, { min = 1, max = 100 } = {}) => {
  if (typeof value !== 'string') fail(400, `${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    fail(400, `${field} must be between ${min} and ${max} characters.`);
  }
  return trimmed;
};

const number = (value, field, { min = 0, max = Number.MAX_SAFE_INTEGER, integer = false } = {}) => {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    fail(400, `${field} must be ${integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`);
  }
  return n;
};

const oneOf = (value, allowed, field) => {
  if (!allowed.includes(value)) fail(400, `${field} must be one of: ${allowed.join(', ')}.`);
  return value;
};

const bool = (value, field) => {
  if (typeof value !== 'boolean') fail(400, `${field} must be true or false.`);
  return value;
};

const imagePath = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const v = text(value, 'Image', { max: 500 });
  if (!/^\/[A-Za-z0-9/_.-]+$/.test(v) && !/^https?:\/\/[^\s"'<>]+$/.test(v)) {
    fail(400, 'Image must be a local path like /images/x.webp or an http(s):// URL.');
  }
  return v;
};

// -----------------------------------------------------------------------------
// Row <-> API mappers (DB is snake_case, API is camelCase)
// -----------------------------------------------------------------------------
const toTable = (t) => ({
  id: t.id,
  number: t.number,
  capacity: t.capacity,
  status: t.status,
  currentOrderId: t.current_order_id || undefined,
  timerStart: t.timer_start ? Number(t.timer_start) : undefined,
  isOutdoor: t.is_outdoor,
  groupId: t.group_id || undefined,
});

const toMenuItem = (m) => ({
  id: m.id,
  name: m.name,
  price: Number(m.price),
  category: m.category,
  isAvailable: m.is_available,
  dietary: m.dietary || [],
  image: m.image || undefined,
});

const toOrder = (o) => ({
  id: o.id,
  tableId: o.table_id,
  tableNumber: o.table_number,
  items: o.items || [],
  status: o.status,
  timestamp: Number(o.timestamp),
  subtotal: Number(o.subtotal),
  tax: Number(o.tax),
  total: Number(o.total),
});

const toSettings = (s) => ({
  storeName: s.store_name,
  taxRate: Number(s.tax_rate),
  currency: s.currency,
});

const toStaff = (r, selfId) => ({
  userId: r.user_id,
  email: r.email || '',
  role: r.role,
  createdAt: r.created_at,
  isYou: r.user_id === selfId,
});

// -----------------------------------------------------------------------------
// Cafe-scoped data helpers
// -----------------------------------------------------------------------------
const FREE_TABLE = { status: 'available', current_order_id: null, timer_start: null, group_id: null };

const getSettings = async (db, cafeId) => {
  const row = unwrap(await db.from('settings').select('*').eq('cafe_id', cafeId).maybeSingle());
  return row ? toSettings(row) : { ...DEFAULT_SETTINGS };
};

const getOrderOr404 = async (db, cafeId, orderId) => {
  const row = unwrap(await db.from('orders').select('*').eq('cafe_id', cafeId).eq('id', orderId).maybeSingle());
  if (!row) fail(404, 'Order not found.');
  return row;
};

const getTableOr404 = async (db, cafeId, tableId) => {
  const row = unwrap(await db.from('tables').select('*').eq('cafe_id', cafeId).eq('id', tableId).maybeSingle());
  if (!row) fail(404, 'Table not found.');
  return row;
};

/** Free every table of this cafe linked to `orderId` (including whole seating groups). */
const freeTablesForOrder = async (db, cafeId, orderId) => {
  const linked = unwrap(
    await db.from('tables').select('id, group_id').eq('cafe_id', cafeId).eq('current_order_id', orderId)
  ) || [];
  if (linked.length === 0) return;

  unwrap(await db.from('tables').update(FREE_TABLE).eq('cafe_id', cafeId).in('id', linked.map((t) => t.id)));

  const groupIds = [...new Set(linked.map((t) => t.group_id).filter(Boolean))];
  if (groupIds.length > 0) {
    unwrap(await db.from('tables').update(FREE_TABLE).eq('cafe_id', cafeId).in('group_id', groupIds));
  }
};

/** Validate order lines and compute totals from THIS cafe's menu prices + tax rate. */
const priceOrder = async (db, cafeId, rawItems) => {
  if (!Array.isArray(rawItems)) fail(400, 'Items must be a list.');
  if (rawItems.length > 200) fail(400, 'Too many items in one order.');

  const items = rawItems.map((it) => {
    if (!it || typeof it !== 'object') fail(400, 'Invalid order item.');
    if (typeof it.menuItemId !== 'string' || !ID_RE.test(it.menuItemId)) fail(400, 'Invalid menu item id.');
    const line = {
      menuItemId: it.menuItemId,
      quantity: number(it.quantity, 'Quantity', { min: 1, max: 999, integer: true }),
    };
    if (it.notes) line.notes = text(it.notes, 'Notes', { min: 0, max: 200 });
    return line;
  });

  if (items.length === 0) return { items, subtotal: 0, tax: 0, total: 0 };

  const ids = [...new Set(items.map((i) => i.menuItemId))];
  const menuRows = unwrap(await db.from('menu_items').select('id, price').eq('cafe_id', cafeId).in('id', ids)) || [];
  const priceById = new Map(menuRows.map((m) => [m.id, Number(m.price)]));
  const missing = ids.filter((id) => !priceById.has(id));
  if (missing.length > 0) fail(400, 'Some items are not on this cafe\'s menu.');

  const { taxRate } = await getSettings(db, cafeId);
  const subtotal = round2(items.reduce((sum, i) => sum + priceById.get(i.menuItemId) * i.quantity, 0));
  const tax = round2(subtotal * taxRate);
  return { items, subtotal, tax, total: round2(subtotal + tax) };
};

const countOwners = async (db, cafeId) => {
  const { count, error } = await db
    .from('user_roles')
    .select('user_id', { count: 'exact', head: true })
    .eq('cafe_id', cafeId)
    .eq('role', 'owner');
  if (error) throw error;
  return count || 0;
};

// -----------------------------------------------------------------------------
// Middleware
// -----------------------------------------------------------------------------
app.use('*', async (c, next) => {
  const allowList = (c.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  return cors({
    origin: allowList.length === 0 ? '*' : (origin) => (allowList.includes(origin) ? origin : null),
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  })(c, next);
});

/** Verify the Supabase JWT and load the caller's membership (cafe + role). */
app.use('/api/*', async (c, next) => {
  if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    fail(500, 'Server is not configured.');
  }

  const db = createClient(c.env.SUPABASE_URL, c.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const header = c.req.header('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) fail(401, 'Not signed in.');

  const { data: userData, error: userError } = await db.auth.getUser(token);
  if (userError || !userData?.user) fail(401, 'Your session has expired. Please sign in again.');
  const user = userData.user;

  const membership = unwrap(
    await db.from('user_roles').select('role, cafe_id').eq('user_id', user.id).maybeSingle()
  );

  c.set('db', db);
  c.set('user', user);
  c.set('role', membership?.role ?? null);
  c.set('cafeId', membership?.cafe_id ?? null);
  await next();
});

const requireRole = (...allowed) => async (c, next) => {
  if (!c.get('cafeId') || !c.get('role')) fail(403, 'Your account is not linked to a cafe.');
  if (!allowed.includes(c.get('role'))) fail(403, 'Your role is not allowed to do this.');
  await next();
};
const anyMember = requireRole('owner', 'counter', 'cook');
const staff = requireRole('owner', 'counter');
const ownerOnly = requireRole('owner');

// -----------------------------------------------------------------------------
// Health
// -----------------------------------------------------------------------------
app.get('/', (c) => c.json({ status: 'online', message: "Patel's Cafe API is running." }));

// -----------------------------------------------------------------------------
// Account & cafe onboarding
// -----------------------------------------------------------------------------
app.get('/api/me', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  const cafeId = c.get('cafeId');

  let cafeName = null;
  if (cafeId) {
    const cafe = unwrap(await db.from('cafes').select('name').eq('id', cafeId).maybeSingle());
    cafeName = cafe?.name ?? null;
  }

  return c.json({ id: user.id, email: user.email, role: c.get('role'), cafeId, cafeName });
});

/** Self-service: a signed-in user with no cafe creates one and becomes its owner. */
app.post('/api/cafes', async (c) => {
  const db = c.get('db');
  const user = c.get('user');
  if (c.get('cafeId')) fail(409, 'Your account already belongs to a cafe.');

  const body = await readJson(c);
  const name = text(body.name, 'Cafe name', { min: 2, max: 80 });
  const cafeId = newId('cafe');

  unwrap(await db.rpc('create_cafe', {
    p_cafe_id: cafeId,
    p_name: name,
    p_user_id: user.id,
    p_email: user.email ?? null,
  }));

  return c.json({ id: user.id, email: user.email, role: 'owner', cafeId, cafeName: name }, 201);
});

// -----------------------------------------------------------------------------
// Staff management (owner only)
// -----------------------------------------------------------------------------
app.get('/api/staff', ownerOnly, async (c) => {
  const rows = unwrap(
    await c.get('db')
      .from('user_roles')
      .select('user_id, email, role, created_at')
      .eq('cafe_id', c.get('cafeId'))
      .order('created_at', { ascending: true })
  ) || [];
  return c.json(rows.map((r) => toStaff(r, c.get('user').id)));
});

/**
 * Add a staff member by e-mail.
 *  - New e-mail      → Supabase sends an invite e-mail; they set a password via the link.
 *  - Existing account with no cafe → linked to this cafe straight away.
 *  - Account already in a cafe     → rejected (one cafe per account).
 */
app.post('/api/staff', ownerOnly, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const body = await readJson(c);

  const email = text(body.email, 'Email', { min: 3, max: 254 }).toLowerCase();
  if (!EMAIL_RE.test(email)) fail(400, 'Please enter a valid email address.');
  const role = oneOf(body.role, ROLES, 'Role');

  const existingUserId = unwrap(await db.rpc('find_auth_user_by_email', { p_email: email }));

  if (existingUserId) {
    const membership = unwrap(
      await db.from('user_roles').select('cafe_id').eq('user_id', existingUserId).maybeSingle()
    );
    if (membership?.cafe_id === cafeId) fail(409, `${email} is already on your team.`);
    if (membership) fail(409, `${email} already belongs to another cafe.`);

    const row = unwrap(
      await db.from('user_roles')
        .insert({ user_id: existingUserId, role, cafe_id: cafeId, email })
        .select('user_id, email, role, created_at')
        .single()
    );
    return c.json({ status: 'added', member: toStaff(row, c.get('user').id) }, 201);
  }

  const redirectBase = c.env.APP_URL || c.req.header('Origin');
  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(email, {
    data: { invited_role: role, invited_cafe_id: cafeId },
    ...(redirectBase ? { redirectTo: `${redirectBase.replace(/\/+$/, '')}/` } : {}),
  });
  if (inviteError || !invited?.user) fail(400, inviteError?.message || 'Could not send the invitation.');

  const { data: row, error: linkError } = await db
    .from('user_roles')
    .insert({ user_id: invited.user.id, role, cafe_id: cafeId, email })
    .select('user_id, email, role, created_at')
    .single();
  if (linkError) {
    // Don't leave a dangling invited account that belongs to no cafe.
    await db.auth.admin.deleteUser(invited.user.id).catch(() => {});
    throw linkError;
  }

  return c.json({ status: 'invited', member: toStaff(row, c.get('user').id) }, 201);
});

app.put('/api/staff/:userId', ownerOnly, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const userId = c.req.param('userId');
  if (!UUID_RE.test(userId)) fail(400, 'Invalid user id.');

  const body = await readJson(c);
  const role = oneOf(body.role, ROLES, 'Role');

  const target = unwrap(
    await db.from('user_roles').select('role').eq('cafe_id', cafeId).eq('user_id', userId).maybeSingle()
  );
  if (!target) fail(404, 'Staff member not found.');
  if (target.role === 'owner' && role !== 'owner' && (await countOwners(db, cafeId)) <= 1) {
    fail(400, 'A cafe must keep at least one owner.');
  }

  const row = unwrap(
    await db.from('user_roles')
      .update({ role })
      .eq('cafe_id', cafeId)
      .eq('user_id', userId)
      .select('user_id, email, role, created_at')
      .single()
  );
  return c.json(toStaff(row, c.get('user').id));
});

app.delete('/api/staff/:userId', ownerOnly, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const userId = c.req.param('userId');
  if (!UUID_RE.test(userId)) fail(400, 'Invalid user id.');

  const target = unwrap(
    await db.from('user_roles').select('role').eq('cafe_id', cafeId).eq('user_id', userId).maybeSingle()
  );
  if (!target) fail(404, 'Staff member not found.');
  if (target.role === 'owner' && (await countOwners(db, cafeId)) <= 1) {
    fail(400, 'A cafe must keep at least one owner.');
  }

  unwrap(await db.from('user_roles').delete().eq('cafe_id', cafeId).eq('user_id', userId));
  return c.json({ success: true, userId });
});

// -----------------------------------------------------------------------------
// Settings
// -----------------------------------------------------------------------------
app.get('/api/settings', anyMember, async (c) => {
  return c.json(await getSettings(c.get('db'), c.get('cafeId')));
});

app.put('/api/settings', ownerOnly, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const body = await readJson(c);
  const current = await getSettings(db, cafeId);

  const next = {
    storeName: has(body, 'storeName') ? text(body.storeName, 'Store name', { min: 0, max: 80 }) : current.storeName,
    taxRate: has(body, 'taxRate') ? number(body.taxRate, 'Tax rate', { min: 0, max: 1 }) : current.taxRate,
    currency: has(body, 'currency') ? text(body.currency, 'Currency', { min: 0, max: 5 }) : current.currency,
  };

  const row = unwrap(
    await db.from('settings')
      .upsert(
        { cafe_id: cafeId, store_name: next.storeName, tax_rate: next.taxRate, currency: next.currency },
        { onConflict: 'cafe_id' }
      )
      .select()
      .single()
  );
  return c.json(toSettings(row));
});

// Danger zone — every reset only touches the caller's cafe.
app.post('/api/settings/clear-tables', ownerOnly, async (c) => {
  unwrap(await c.get('db').from('tables').delete().eq('cafe_id', c.get('cafeId')));
  return c.json({ success: true, message: 'All tables cleared.' });
});

app.post('/api/settings/clear-menu', ownerOnly, async (c) => {
  unwrap(await c.get('db').from('menu_items').delete().eq('cafe_id', c.get('cafeId')));
  return c.json({ success: true, message: 'All menu items cleared.' });
});

app.post('/api/settings/clear-orders', ownerOnly, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  unwrap(await db.from('orders').delete().eq('cafe_id', cafeId));
  unwrap(await db.from('tables').update(FREE_TABLE).eq('cafe_id', cafeId));
  return c.json({ success: true, message: 'All orders cleared.' });
});

// -----------------------------------------------------------------------------
// Tables
// -----------------------------------------------------------------------------
app.get('/api/tables', staff, async (c) => {
  const rows = unwrap(
    await c.get('db').from('tables').select('*').eq('cafe_id', c.get('cafeId')).order('number', { ascending: true })
  ) || [];
  return c.json(rows.map(toTable));
});

app.post('/api/tables', ownerOnly, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const body = await readJson(c);

  const tableNumber = text(body.number, 'Table number', { max: 20 });
  const capacity = number(body.capacity ?? 4, 'Capacity', { min: 1, max: 50, integer: true });
  const isOutdoor = has(body, 'isOutdoor') ? bool(body.isOutdoor, 'Outdoor') : false;

  const existing = unwrap(await db.from('tables').select('id, number').eq('cafe_id', cafeId)) || [];
  if (existing.some((t) => t.number.toLowerCase() === tableNumber.toLowerCase())) {
    fail(409, `Table number ${tableNumber} already exists.`);
  }

  const row = unwrap(
    await db.from('tables')
      .insert({ id: newId('t'), cafe_id: cafeId, number: tableNumber, capacity, is_outdoor: isOutdoor, status: 'available' })
      .select()
      .single()
  );
  return c.json(toTable(row), 201);
});

/** Partial update: only keys present in the body change; `null` clears a field. */
app.put('/api/tables/:id', staff, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const id = idParam(c);
  const body = await readJson(c);
  await getTableOr404(db, cafeId, id);

  const patch = {};
  if (has(body, 'status')) patch.status = oneOf(body.status, TABLE_STATUSES, 'Status');
  if (has(body, 'capacity')) patch.capacity = number(body.capacity, 'Capacity', { min: 1, max: 50, integer: true });
  if (has(body, 'isOutdoor')) patch.is_outdoor = bool(body.isOutdoor, 'Outdoor');
  if (has(body, 'timerStart')) {
    patch.timer_start = body.timerStart == null ? null : number(body.timerStart, 'Timer start', { integer: true });
  }
  if (has(body, 'groupId')) {
    if (body.groupId != null && (typeof body.groupId !== 'string' || !ID_RE.test(body.groupId))) {
      fail(400, 'Invalid group id.');
    }
    patch.group_id = body.groupId ?? null;
  }
  if (has(body, 'currentOrderId')) {
    if (body.currentOrderId == null) {
      patch.current_order_id = null;
    } else {
      if (typeof body.currentOrderId !== 'string' || !ID_RE.test(body.currentOrderId)) fail(400, 'Invalid order id.');
      await getOrderOr404(db, cafeId, body.currentOrderId);
      patch.current_order_id = body.currentOrderId;
    }
  }
  if (patch.status === 'available') Object.assign(patch, FREE_TABLE);

  const row = unwrap(await db.from('tables').update(patch).eq('cafe_id', cafeId).eq('id', id).select().single());
  return c.json(toTable(row));
});

app.delete('/api/tables/:id', ownerOnly, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const id = idParam(c);

  const table = await getTableOr404(db, cafeId, id);
  if (table.status === 'occupied') fail(409, `Cannot remove table ${table.number} because it is occupied.`);

  unwrap(await db.from('tables').delete().eq('cafe_id', cafeId).eq('id', id));
  return c.json({ message: 'Table removed successfully', id });
});

app.post('/api/tables/:id/clear', staff, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const table = await getTableOr404(db, cafeId, idParam(c));

  const query = db.from('tables').update(FREE_TABLE).eq('cafe_id', cafeId);
  unwrap(await (table.group_id ? query.eq('group_id', table.group_id) : query.eq('id', table.id)));
  return c.json({ message: 'Table(s) cleared successfully' });
});

app.post('/api/tables/seat-group', staff, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const body = await readJson(c);

  const tableIds = Array.isArray(body.tableIds) ? [...new Set(body.tableIds)] : [];
  if (tableIds.length < 1 || tableIds.length > 20 || !tableIds.every((id) => typeof id === 'string' && ID_RE.test(id))) {
    fail(400, 'Select between 1 and 20 tables.');
  }

  const rows = unwrap(await db.from('tables').select('id, number, status').eq('cafe_id', cafeId).in('id', tableIds)) || [];
  if (rows.length !== tableIds.length) fail(404, 'One or more tables were not found.');
  const busy = rows.filter((t) => t.status !== 'available');
  if (busy.length > 0) fail(409, `Table ${busy.map((t) => t.number).join(', ')} is already occupied.`);

  const label = rows.map((t) => t.number).sort((a, b) => a.localeCompare(b)).join(' + ');
  const orderId = newId('ord');
  const groupId = newId('g');
  const timestamp = Date.now();

  unwrap(await db.from('orders').insert({
    id: orderId,
    cafe_id: cafeId,
    table_id: tableIds[0],
    table_number: label,
    items: [],
    status: 'pending',
    timestamp,
    subtotal: 0,
    tax: 0,
    total: 0,
  }));

  const { error: seatError } = await db
    .from('tables')
    .update({ status: 'occupied', current_order_id: orderId, group_id: groupId, timer_start: timestamp })
    .eq('cafe_id', cafeId)
    .in('id', tableIds);
  if (seatError) {
    await db.from('orders').delete().eq('cafe_id', cafeId).eq('id', orderId);
    throw seatError;
  }

  return c.json({ message: 'Tables grouped and seated successfully', orderId, groupId, tableNumber: label });
});

// -----------------------------------------------------------------------------
// Menu
// -----------------------------------------------------------------------------
app.get('/api/menu', anyMember, async (c) => {
  const rows = unwrap(
    await c.get('db')
      .from('menu_items')
      .select('*')
      .eq('cafe_id', c.get('cafeId'))
      .order('category', { ascending: true })
      .order('name', { ascending: true })
  ) || [];
  return c.json(rows.map(toMenuItem));
});

const menuPatch = (body, { partial }) => {
  const patch = {};
  if (!partial || has(body, 'name')) patch.name = text(body.name, 'Name', { max: 100 });
  if (!partial || has(body, 'price')) patch.price = round2(number(body.price, 'Price', { min: 0, max: 1000000 }));
  if (!partial || has(body, 'category')) patch.category = oneOf(body.category, MENU_CATEGORIES, 'Category');
  if (has(body, 'isAvailable')) patch.is_available = bool(body.isAvailable, 'Available');
  if (has(body, 'dietary')) {
    if (!Array.isArray(body.dietary) || !body.dietary.every((d) => DIETARY.includes(d))) {
      fail(400, `Dietary must be a list of: ${DIETARY.join(', ')}.`);
    }
    patch.dietary = [...new Set(body.dietary)];
  }
  if (has(body, 'image')) patch.image = imagePath(body.image);
  return patch;
};

app.post('/api/menu', staff, async (c) => {
  const body = await readJson(c);
  const patch = menuPatch(body, { partial: false });
  const row = unwrap(
    await c.get('db')
      .from('menu_items')
      .insert({ is_available: true, dietary: [], image: null, ...patch, id: newId('m'), cafe_id: c.get('cafeId') })
      .select()
      .single()
  );
  return c.json(toMenuItem(row), 201);
});

app.put('/api/menu/:id', staff, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const id = idParam(c);
  const patch = menuPatch(await readJson(c), { partial: true });

  const row = unwrap(await db.from('menu_items').update(patch).eq('cafe_id', cafeId).eq('id', id).select().maybeSingle());
  if (!row) fail(404, 'Menu item not found.');
  return c.json(toMenuItem(row));
});

app.delete('/api/menu/:id', staff, async (c) => {
  const id = idParam(c);
  const rows = unwrap(
    await c.get('db').from('menu_items').delete().eq('cafe_id', c.get('cafeId')).eq('id', id).select('id')
  ) || [];
  if (rows.length === 0) fail(404, 'Menu item not found.');
  return c.json({ message: 'Menu item deleted successfully', id });
});

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------
app.get('/api/orders', anyMember, async (c) => {
  const { status, startDate, endDate } = c.req.query();
  let query = c.get('db').from('orders').select('*').eq('cafe_id', c.get('cafeId'));

  // ?status=pending or ?status=pending,preparing,ready
  if (status) query = query.in('status', status.split(',').map((s) => oneOf(s.trim(), ORDER_STATUSES, 'Status')));
  if (startDate) query = query.gte('timestamp', number(startDate, 'startDate', { integer: true }));
  if (endDate) query = query.lte('timestamp', number(endDate, 'endDate', { integer: true }));

  const rows = unwrap(await query.order('timestamp', { ascending: false })) || [];
  return c.json(rows.map(toOrder));
});

/** Create an order for a table (or a walk-in). Totals are always computed here. */
app.post('/api/orders', staff, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const body = await readJson(c);

  if (typeof body.tableId !== 'string' || !ID_RE.test(body.tableId)) fail(400, 'Invalid table id.');
  const isWalkIn = body.tableId.startsWith(WALK_IN_PREFIX);

  const priced = await priceOrder(db, cafeId, body.items);
  if (priced.items.length === 0) fail(400, 'An order needs at least one item.');

  let tableNumber = 'Walk-in';
  let table = null;
  if (!isWalkIn) {
    table = await getTableOr404(db, cafeId, body.tableId);
    if (table.current_order_id) {
      const open = unwrap(
        await db.from('orders').select('status').eq('cafe_id', cafeId).eq('id', table.current_order_id).maybeSingle()
      );
      if (open && open.status !== 'paid') fail(409, `Table ${table.number} already has an open order.`);
    }
    tableNumber = table.number;
  }

  const orderId = newId('ord');
  const timestamp = Date.now();
  const row = unwrap(
    await db.from('orders')
      .insert({
        id: orderId,
        cafe_id: cafeId,
        table_id: body.tableId,
        table_number: tableNumber,
        items: priced.items,
        status: 'pending',
        timestamp,
        subtotal: priced.subtotal,
        tax: priced.tax,
        total: priced.total,
      })
      .select()
      .single()
  );

  if (table) {
    unwrap(
      await db.from('tables')
        .update({ status: 'occupied', current_order_id: orderId, timer_start: table.timer_start || timestamp })
        .eq('cafe_id', cafeId)
        .eq('id', table.id)
    );
  }

  return c.json(toOrder(row), 201);
});

/**
 * Update an order.
 *   owner / counter: items (totals recomputed) and/or status.
 *   cook:            status only, and only to 'preparing' or 'ready'.
 * Setting status to 'paid' frees the linked table(s).
 */
app.put('/api/orders/:id', anyMember, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const role = c.get('role');
  const id = idParam(c);
  const body = await readJson(c);

  const order = await getOrderOr404(db, cafeId, id);
  if (order.status === 'paid') fail(409, 'This order is already paid and can no longer be changed.');

  const patch = {};
  if (role === 'cook') {
    patch.status = oneOf(body.status, COOK_ORDER_STATUSES, 'Status');
  } else {
    if (has(body, 'status')) patch.status = oneOf(body.status, ORDER_STATUSES, 'Status');
    if (has(body, 'items')) {
      const priced = await priceOrder(db, cafeId, body.items);
      Object.assign(patch, priced);
    }
  }
  if (Object.keys(patch).length === 0) fail(400, 'Nothing to update.');

  const row = unwrap(await db.from('orders').update(patch).eq('cafe_id', cafeId).eq('id', id).select().single());

  if (patch.status === 'paid') await freeTablesForOrder(db, cafeId, id);

  return c.json(toOrder(row));
});

app.delete('/api/orders/:id', staff, async (c) => {
  const db = c.get('db');
  const cafeId = c.get('cafeId');
  const id = idParam(c);

  await getOrderOr404(db, cafeId, id);
  await freeTablesForOrder(db, cafeId, id);
  unwrap(await db.from('orders').delete().eq('cafe_id', cafeId).eq('id', id));
  return c.json({ message: 'Order deleted successfully', id });
});

// -----------------------------------------------------------------------------
// Errors
// -----------------------------------------------------------------------------
app.notFound((c) => c.json({ error: 'Not found.' }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  if (err && err.code === '23505') {
    return c.json({ error: 'That record already exists.' }, 409);
  }
  console.error('Unhandled API error:', err);
  return c.json({ error: 'Something went wrong on the server. Please try again.' }, 500);
});

export default app;
