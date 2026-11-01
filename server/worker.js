import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@supabase/supabase-js';

const app = new Hono();

// ==========================================
// CORS — allow all origins (restrict in production if needed)
// ==========================================
app.use('*', cors());

// ==========================================
// Supabase client factory (per-request, using Worker env bindings)
// ==========================================
const getSupabase = (env) =>
  createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ==========================================
// Auth Middleware — verifies Supabase JWT on every protected route
// ==========================================
const authenticateToken = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'No authorization token provided' }, 401);
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabase(c.env);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return c.json({ error: 'Invalid or expired auth session' }, 401);
  }

  c.set('user', user);
  await next();
};

// ==========================================
// Root health check
// ==========================================
app.get('/', (c) => {
  return c.json({ status: 'online', message: "Patel's Cafe API Server is running!" });
});

// ==========================================
// ⚙️ Settings Endpoints
// ==========================================

app.get('/api/settings', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) return c.json({ error: error.message }, 500);

  if (!data) {
    return c.json({ storeName: 'Patel Sandwichwala', taxRate: 0.05, currency: '₹' });
  }

  return c.json({
    storeName: data.store_name,
    taxRate: Number(data.tax_rate),
    currency: data.currency,
  });
});

app.put('/api/settings', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { storeName, taxRate, currency } = await c.req.json();

  const { data, error } = await supabase
    .from('settings')
    .upsert({ id: 1, store_name: storeName, tax_rate: taxRate, currency })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  return c.json({
    storeName: data.store_name,
    taxRate: Number(data.tax_rate),
    currency: data.currency,
  });
});

// ==========================================
// 🪑 Tables Endpoints
// ==========================================

app.get('/api/tables', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .order('number', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  return c.json(data.map(t => ({
    id: t.id,
    number: t.number,
    capacity: t.capacity,
    status: t.status,
    currentOrderId: t.current_order_id || undefined,
    timerStart: t.timer_start ? Number(t.timer_start) : undefined,
    isOutdoor: t.is_outdoor,
    groupId: t.group_id || undefined,
  })));
});

app.post('/api/tables', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { number, capacity, isOutdoor } = await c.req.json();

  const { data: existing } = await supabase
    .from('tables')
    .select('id')
    .eq('number', number)
    .maybeSingle();

  if (existing) {
    return c.json({ error: `Table number ${number} already exists.` }, 400);
  }

  const tableId = `t-${Date.now()}`;
  const { data, error } = await supabase
    .from('tables')
    .insert({ id: tableId, number, capacity, is_outdoor: isOutdoor || false, status: 'available' })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  return c.json({
    id: data.id,
    number: data.number,
    capacity: data.capacity,
    status: data.status,
    isOutdoor: data.is_outdoor,
  }, 201);
});

// Group seating — must come BEFORE /:id routes to avoid route conflict
app.post('/api/tables/seat-group', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { tableIds } = await c.req.json();

  if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
    return c.json({ error: 'Invalid table IDs provided.' }, 400);
  }

  const { data: tablesData, error: fetchErr } = await supabase
    .from('tables')
    .select('number')
    .in('id', tableIds);

  if (fetchErr) return c.json({ error: fetchErr.message }, 500);

  const tableNumbers = tablesData.map(t => t.number).sort((a, b) => a.localeCompare(b));
  const combinedLabel = tableNumbers.join(' + ');
  const orderId = `ord-${Date.now()}`;
  const groupId = `g-${Date.now()}`;
  const timestamp = Date.now();

  const { error: orderErr } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      table_id: tableIds[0],
      table_number: combinedLabel,
      items: [],
      status: 'pending',
      timestamp,
      subtotal: 0,
      tax: 0,
      total: 0,
    });

  if (orderErr) return c.json({ error: orderErr.message }, 500);

  const { error: tableErr } = await supabase
    .from('tables')
    .update({ status: 'occupied', current_order_id: orderId, group_id: groupId, timer_start: timestamp })
    .in('id', tableIds);

  if (tableErr) return c.json({ error: tableErr.message }, 500);

  return c.json({ message: 'Tables grouped and seated successfully', orderId, groupId, tableNumber: combinedLabel });
});

app.post('/api/tables/:id/clear', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');

  const { data: table, error: checkError } = await supabase
    .from('tables')
    .select('group_id')
    .eq('id', id)
    .single();

  if (checkError) return c.json({ error: checkError.message }, 500);

  if (table && table.group_id) {
    const { error } = await supabase
      .from('tables')
      .update({ status: 'available', current_order_id: null, timer_start: null, group_id: null })
      .eq('group_id', table.group_id);
    if (error) return c.json({ error: error.message }, 500);
  } else {
    const { error } = await supabase
      .from('tables')
      .update({ status: 'available', current_order_id: null, timer_start: null, group_id: null })
      .eq('id', id);
    if (error) return c.json({ error: error.message }, 500);
  }

  return c.json({ message: 'Table(s) cleared successfully' });
});

app.put('/api/tables/:id', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');
  const { capacity, status, currentOrderId, timerStart, isOutdoor, groupId } = await c.req.json();

  const { data, error } = await supabase
    .from('tables')
    .update({
      capacity,
      status,
      current_order_id: currentOrderId || null,
      timer_start: timerStart || null,
      is_outdoor: isOutdoor,
      group_id: groupId || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  return c.json({
    id: data.id,
    number: data.number,
    capacity: data.capacity,
    status: data.status,
    currentOrderId: data.current_order_id || undefined,
    timerStart: data.timer_start ? Number(data.timer_start) : undefined,
    isOutdoor: data.is_outdoor,
    groupId: data.group_id || undefined,
  });
});

app.delete('/api/tables/:id', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');

  const { data: table, error: checkError } = await supabase
    .from('tables')
    .select('status, number')
    .eq('id', id)
    .single();

  if (checkError) return c.json({ error: checkError.message }, 500);

  if (table && table.status === 'occupied') {
    return c.json({ error: `Cannot remove table ${table.number} because it is occupied.` }, 400);
  }

  const { error } = await supabase.from('tables').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ message: 'Table removed successfully', id });
});

// ==========================================
// 🍔 Menu Endpoints
// ==========================================

app.get('/api/menu', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) return c.json({ error: error.message }, 500);

  return c.json(data.map(item => ({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    category: item.category,
    isAvailable: item.is_available,
    dietary: item.dietary || [],
    image: item.image || undefined,
  })));
});

app.post('/api/menu', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { name, price, category, isAvailable, dietary, image } = await c.req.json();

  const id = `m-${Date.now()}`;
  const { data, error } = await supabase
    .from('menu_items')
    .insert({ id, name, price, category, is_available: isAvailable !== undefined ? isAvailable : true, dietary: dietary || [], image: image || null })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  return c.json({
    id: data.id,
    name: data.name,
    price: Number(data.price),
    category: data.category,
    isAvailable: data.is_available,
    dietary: data.dietary,
    image: data.image || undefined,
  }, 201);
});

app.put('/api/menu/:id', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');
  const { name, price, category, isAvailable, dietary, image } = await c.req.json();

  const { data, error } = await supabase
    .from('menu_items')
    .update({ name, price, category, is_available: isAvailable, dietary: dietary || [], image: image || null })
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  return c.json({
    id: data.id,
    name: data.name,
    price: Number(data.price),
    category: data.category,
    isAvailable: data.is_available,
    dietary: data.dietary,
    image: data.image || undefined,
  });
});

app.delete('/api/menu/:id', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');

  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ message: 'Menu item deleted successfully', id });
});

// ==========================================
// 📝 Orders Endpoints
// ==========================================

app.get('/api/orders', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { status, startDate, endDate } = c.req.query();

  let query = supabase.from('orders').select('*');
  if (status) query = query.eq('status', status);
  if (startDate) query = query.gte('timestamp', Number(startDate));
  if (endDate) query = query.lte('timestamp', Number(endDate));

  const { data, error } = await query.order('timestamp', { ascending: false });
  if (error) return c.json({ error: error.message }, 500);

  return c.json(data.map(o => ({
    id: o.id,
    tableId: o.table_id,
    tableNumber: o.table_number,
    items: o.items,
    status: o.status,
    timestamp: Number(o.timestamp),
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    total: Number(o.total),
  })));
});

app.post('/api/orders', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const { id, tableId, tableNumber, items, status, timestamp, subtotal, tax, total } = await c.req.json();

  const orderId = id || `ord-${Date.now()}`;
  const orderTimestamp = timestamp || Date.now();

  const { data, error } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      table_id: tableId,
      table_number: tableNumber,
      items: items || [],
      status: status || 'pending',
      timestamp: orderTimestamp,
      subtotal: subtotal || 0,
      tax: tax || 0,
      total: total || 0,
    })
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  const isWalkIn = tableId.startsWith('walk-in');
  if (!isWalkIn) {
    await supabase
      .from('tables')
      .update({ status: 'occupied', current_order_id: orderId, timer_start: orderTimestamp })
      .eq('id', tableId);
  }

  return c.json({
    id: data.id,
    tableId: data.table_id,
    tableNumber: data.table_number,
    items: data.items,
    status: data.status,
    timestamp: Number(data.timestamp),
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    total: Number(data.total),
  }, 201);
});

app.put('/api/orders/:id', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');
  const { items, status, subtotal, tax, total } = await c.req.json();

  const { data, error } = await supabase
    .from('orders')
    .update({ items, status, subtotal, tax, total })
    .eq('id', id)
    .select()
    .single();

  if (error) return c.json({ error: error.message }, 500);

  if (status === 'paid') {
    const { data: linkedTables } = await supabase
      .from('tables')
      .select('id, group_id')
      .eq('current_order_id', id);

    if (linkedTables && linkedTables.length > 0) {
      const tableIds = linkedTables.map(t => t.id);
      const groupIds = linkedTables.map(t => t.group_id).filter(Boolean);

      await supabase
        .from('tables')
        .update({ status: 'available', current_order_id: null, timer_start: null, group_id: null })
        .in('id', tableIds);

      if (groupIds.length > 0) {
        await supabase
          .from('tables')
          .update({ status: 'available', current_order_id: null, timer_start: null, group_id: null })
          .in('group_id', groupIds);
      }
    }
  }

  return c.json({
    id: data.id,
    tableId: data.table_id,
    tableNumber: data.table_number,
    items: data.items,
    status: data.status,
    timestamp: Number(data.timestamp),
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    total: Number(data.total),
  });
});

app.delete('/api/orders/:id', authenticateToken, async (c) => {
  const supabase = getSupabase(c.env);
  const id = c.req.param('id');

  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) return c.json({ error: error.message }, 500);

  return c.json({ message: 'Order deleted successfully', id });
});

export default app;
