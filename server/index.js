require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and parsing of JSON request bodies
app.use(cors());
app.use(express.json());

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
}

const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

// Authentication Middleware to verify client-side Supabase JWT
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired auth session' });
    }

    let role = 'counter';
    let cafeId = 'patel-cafe-main';

    try {
      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role, cafe_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleRow) {
        if (roleRow.role) role = roleRow.role;
        if (roleRow.cafe_id) cafeId = roleRow.cafe_id;
      } else {
        if (user.user_metadata?.role) role = user.user_metadata.role;
        if (user.user_metadata?.cafe_id) cafeId = user.user_metadata.cafe_id;
        if (user.email?.toLowerCase().includes('cook')) role = 'cook';
      }
    } catch (err) {
      console.error('Error fetching role in express:', err);
    }

    req.user = user;
    req.role = role;
    req.cafeId = cafeId;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(500).json({ error: 'Internal server error during auth verification' });
  }
};

// Global error handling wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/', (req, res) => {
  res.json({ status: 'online', message: "Patel's Cafe API Server is running!" });
});

// ==========================================
// 👤 User Role Endpoints
// ==========================================

app.get('/api/me', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.role,
    cafeId: req.cafeId,
  });
}));

app.post('/api/user-role', authenticateToken, asyncHandler(async (req, res) => {
  const { role } = req.body;
  if (role !== 'counter' && role !== 'cook') {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const { data, error } = await supabase
    .from('user_roles')
    .upsert({ user_id: req.user.id, role, cafe_id: req.cafeId }, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw error;

  res.json({ success: true, role: data.role, cafeId: data.cafe_id });
}));

// ==========================================
// ✉️ Invite Cook Endpoint
// ==========================================
app.post('/api/invite-cook', authenticateToken, asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const origin = req.headers.origin || 'https://patel-cafe.vercel.app';
  const redirectTo = `${origin}/`;

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email.trim().toLowerCase(), {
    data: {
      role: 'cook',
      cafe_id: req.cafeId,
    },
    redirectTo,
  });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (data?.user) {
    await supabase
      .from('user_roles')
      .upsert({
        user_id: data.user.id,
        role: 'cook',
        cafe_id: req.cafeId,
      }, { onConflict: 'user_id' });
  }

  res.json({
    success: true,
    message: `Invitation successfully sent to ${email}.`,
    user: data?.user,
  });
}));

// Clear / Reset Endpoints for Settings
app.post('/api/settings/clear-tables', authenticateToken, asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('tables')
    .delete()
    .or(`cafe_id.eq.${req.cafeId},cafe_id.is.null`);

  if (error) throw error;
  res.json({ success: true, message: 'All tables cleared.' });
}));

app.post('/api/settings/clear-menu', authenticateToken, asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('menu_items')
    .delete()
    .or(`cafe_id.eq.${req.cafeId},cafe_id.is.null`);

  if (error) throw error;
  res.json({ success: true, message: 'All menu items cleared.' });
}));

app.post('/api/settings/clear-orders', authenticateToken, asyncHandler(async (req, res) => {
  const { error } = await supabase
    .from('orders')
    .delete()
    .or(`cafe_id.eq.${req.cafeId},cafe_id.is.null`);

  if (error) throw error;

  await supabase
    .from('tables')
    .update({ status: 'available', current_order_id: null, timer_start: null, group_id: null })
    .or(`cafe_id.eq.${req.cafeId},cafe_id.is.null`);

  res.json({ success: true, message: 'All orders cleared.' });
}));

// ==========================================
// ⚙️ Settings Endpoints
// ==========================================

app.get('/api/settings', authenticateToken, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) throw error;
  
  if (!data) {
    // Return default settings if not configured
    return res.json({
      storeName: "Patel Sandwichwala",
      taxRate: 0.05,
      currency: "₹"
    });
  }

  // Format database snake_case to frontend camelCase
  res.json({
    storeName: data.store_name,
    taxRate: Number(data.tax_rate),
    currency: data.currency
  });
}));

app.put('/api/settings', authenticateToken, asyncHandler(async (req, res) => {
  const { storeName, taxRate, currency } = req.body;
  
  const { data, error } = await supabase
    .from('settings')
    .upsert({
      id: 1,
      store_name: storeName,
      tax_rate: taxRate,
      currency: currency
    })
    .select()
    .single();

  if (error) throw error;

  res.json({
    storeName: data.store_name,
    taxRate: Number(data.tax_rate),
    currency: data.currency
  });
}));

// ==========================================
// 🪑 Tables Endpoints
// ==========================================

app.get('/api/tables', authenticateToken, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('tables')
    .select('*')
    .order('number', { ascending: true });

  if (error) throw error;

  // Format to frontend shape
  const formattedTables = data.map(t => ({
    id: t.id,
    number: t.number,
    capacity: t.capacity,
    status: t.status,
    currentOrderId: t.current_order_id || undefined,
    timerStart: t.timer_start ? Number(t.timer_start) : undefined,
    isOutdoor: t.is_outdoor,
    groupId: t.group_id || undefined
  }));

  res.json(formattedTables);
}));

app.post('/api/tables', authenticateToken, asyncHandler(async (req, res) => {
  const { number, capacity, isOutdoor } = req.body;

  // Check if exists
  const { data: existing } = await supabase
    .from('tables')
    .select('id')
    .eq('number', number)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: `Table number ${number} already exists.` });
  }

  const tableId = `t-${Date.now()}`;
  const { data, error } = await supabase
    .from('tables')
    .insert({
      id: tableId,
      number,
      capacity,
      is_outdoor: isOutdoor || false,
      status: 'available'
    })
    .select()
    .single();

  if (error) throw error;

  res.status(201).json({
    id: data.id,
    number: data.number,
    capacity: data.capacity,
    status: data.status,
    isOutdoor: data.is_outdoor
  });
}));

app.put('/api/tables/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { capacity, status, currentOrderId, timerStart, isOutdoor, groupId } = req.body;

  const { data, error } = await supabase
    .from('tables')
    .update({
      capacity,
      status,
      current_order_id: currentOrderId || null,
      timer_start: timerStart || null,
      is_outdoor: isOutdoor,
      group_id: groupId || null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  res.json({
    id: data.id,
    number: data.number,
    capacity: data.capacity,
    status: data.status,
    currentOrderId: data.current_order_id || undefined,
    timerStart: data.timer_start ? Number(data.timer_start) : undefined,
    isOutdoor: data.is_outdoor,
    groupId: data.group_id || undefined
  });
}));

app.delete('/api/tables/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if occupied
  const { data: table, error: checkError } = await supabase
    .from('tables')
    .select('status, number')
    .eq('id', id)
    .single();

  if (checkError) throw checkError;

  if (table && table.status === 'occupied') {
    return res.status(400).json({ error: `Cannot remove table ${table.number} because it is occupied.` });
  }

  const { error } = await supabase
    .from('tables')
    .delete()
    .eq('id', id);

  if (error) throw error;

  res.json({ message: 'Table removed successfully', id });
}));

// Clear a table state
app.post('/api/tables/:id/clear', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Get the table to check group status
  const { data: table, error: checkError } = await supabase
    .from('tables')
    .select('group_id')
    .eq('id', id)
    .single();

  if (checkError) throw checkError;

  if (table && table.group_id) {
    // Clear all tables in the group
    const { error } = await supabase
      .from('tables')
      .update({
        status: 'available',
        current_order_id: null,
        timer_start: null,
        group_id: null
      })
      .eq('group_id', table.group_id);

    if (error) throw error;
  } else {
    // Clear single table
    const { error } = await supabase
      .from('tables')
      .update({
        status: 'available',
        current_order_id: null,
        timer_start: null,
        group_id: null
      })
      .eq('id', id);

    if (error) throw error;
  }

  res.json({ message: 'Table(s) cleared successfully' });
}));

// Seat multiple tables as a group
app.post('/api/tables/seat-group', authenticateToken, asyncHandler(async (req, res) => {
  const { tableIds } = req.body;
  if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
    return res.status(400).json({ error: 'Invalid table IDs provided.' });
  }

  // Get table numbers to create dynamic label
  const { data: tablesData, error: fetchErr } = await supabase
    .from('tables')
    .select('number')
    .in('id', tableIds);

  if (fetchErr) throw fetchErr;

  const tableNumbers = tablesData.map(t => t.number).sort((a, b) => a.localeCompare(b));
  const combinedLabel = tableNumbers.join(' + ');

  const orderId = `ord-${Date.now()}`;
  const groupId = `g-${Date.now()}`;
  const timestamp = Date.now();

  // Create empty pending order
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
      total: 0
    });

  if (orderErr) throw orderErr;

  // Update seating states
  const { error: tableErr } = await supabase
    .from('tables')
    .update({
      status: 'occupied',
      current_order_id: orderId,
      group_id: groupId,
      timer_start: timestamp
    })
    .in('id', tableIds);

  if (tableErr) throw tableErr;

  res.json({
    message: 'Tables grouped and seated successfully',
    orderId,
    groupId,
    tableNumber: combinedLabel
  });
}));

// ==========================================
// 🍔 Menu Endpoints
// ==========================================

app.get('/api/menu', authenticateToken, asyncHandler(async (req, res) => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;

  // Map database snake_case to frontend CamelCase
  const formattedMenu = data.map(item => ({
    id: item.id,
    name: item.name,
    price: Number(item.price),
    category: item.category,
    isAvailable: item.is_available,
    dietary: item.dietary || [],
    image: item.image || undefined
  }));

  res.json(formattedMenu);
}));

app.post('/api/menu', authenticateToken, asyncHandler(async (req, res) => {
  const { name, price, category, isAvailable, dietary, image } = req.body;

  const id = `m-${Date.now()}`;
  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      id,
      name,
      price,
      category,
      is_available: isAvailable !== undefined ? isAvailable : true,
      dietary: dietary || [],
      image: image || null
    })
    .select()
    .single();

  if (error) throw error;

  res.status(201).json({
    id: data.id,
    name: data.name,
    price: Number(data.price),
    category: data.category,
    isAvailable: data.is_available,
    dietary: data.dietary,
    image: data.image || undefined
  });
}));

app.put('/api/menu/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, price, category, isAvailable, dietary, image } = req.body;

  const { data, error } = await supabase
    .from('menu_items')
    .update({
      name,
      price,
      category,
      is_available: isAvailable,
      dietary: dietary || [],
      image: image || null
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  res.json({
    id: data.id,
    name: data.name,
    price: Number(data.price),
    category: data.category,
    isAvailable: data.is_available,
    dietary: data.dietary,
    image: data.image || undefined
  });
}));

app.delete('/api/menu/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabase
    .from('menu_items')
    .delete()
    .eq('id', id);

  if (error) throw error;

  res.json({ message: 'Menu item deleted successfully', id });
}));

// ==========================================
// 📝 Orders & Analytics Reports Endpoints
// ==========================================

app.get('/api/orders', authenticateToken, asyncHandler(async (req, res) => {
  const { status, startDate, endDate } = req.query;

  let query = supabase.from('orders').select('*');

  if (status) {
    query = query.eq('status', status);
  }
  if (startDate) {
    query = query.gte('timestamp', Number(startDate));
  }
  if (endDate) {
    query = query.lte('timestamp', Number(endDate));
  }

  // Order latest first
  const { data, error } = await query.order('timestamp', { ascending: false });

  if (error) throw error;

  const formattedOrders = data.map(o => ({
    id: o.id,
    tableId: o.table_id,
    tableNumber: o.table_number,
    items: o.items, // JSONB structure preserves menuItemId, quantity, notes
    status: o.status,
    timestamp: Number(o.timestamp),
    subtotal: Number(o.subtotal),
    tax: Number(o.tax),
    total: Number(o.total)
  }));

  res.json(formattedOrders);
}));

app.post('/api/orders', authenticateToken, asyncHandler(async (req, res) => {
  const { id, tableId, tableNumber, items, status, timestamp, subtotal, tax, total } = req.body;

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
      total: total || 0
    })
    .select()
    .single();

  if (error) throw error;

  // Auto occupy/update table if not walk-in
  const isWalkIn = tableId.startsWith('walk-in');
  if (!isWalkIn) {
    await supabase
      .from('tables')
      .update({
        status: 'occupied',
        current_order_id: orderId,
        timer_start: orderTimestamp
      })
      .eq('id', tableId);
  }

  res.status(201).json({
    id: data.id,
    tableId: data.table_id,
    tableNumber: data.table_number,
    items: data.items,
    status: data.status,
    timestamp: Number(data.timestamp),
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    total: Number(data.total)
  });
}));

app.put('/api/orders/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { items, status, subtotal, tax, total } = req.body;

  const { data, error } = await supabase
    .from('orders')
    .update({
      items,
      status,
      subtotal,
      tax,
      total
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  // If status is paid, trigger table clear operations automatically
  if (status === 'paid') {
    const { data: linkedTables } = await supabase
      .from('tables')
      .select('id, group_id')
      .eq('current_order_id', id);

    if (linkedTables && linkedTables.length > 0) {
      const tableIds = linkedTables.map(t => t.id);
      const groupIds = linkedTables.map(t => t.group_id).filter(Boolean);

      // Clear the tables linked directly
      await supabase
        .from('tables')
        .update({
          status: 'available',
          current_order_id: null,
          timer_start: null,
          group_id: null
        })
        .in('id', tableIds);

      // If tables are part of a group, clear any other tables in that group
      if (groupIds.length > 0) {
        await supabase
          .from('tables')
          .update({
            status: 'available',
            current_order_id: null,
            timer_start: null,
            group_id: null
          })
          .in('group_id', groupIds);
      }
    }
  }

  res.json({
    id: data.id,
    tableId: data.table_id,
    tableNumber: data.table_number,
    items: data.items,
    status: data.status,
    timestamp: Number(data.timestamp),
    subtotal: Number(data.subtotal),
    tax: Number(data.tax),
    total: Number(data.total)
  });
}));

app.delete('/api/orders/:id', authenticateToken, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase
    .from('orders')
    .delete()
    .eq('id', id);

  if (error) throw error;

  res.json({ message: 'Order deleted successfully', id });
}));

// ==========================================
// 🛑 Error Handling Middleware
// ==========================================

app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'An unexpected error occurred on the server.'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Patel's Cafe API server running on port ${PORT}`);
});
