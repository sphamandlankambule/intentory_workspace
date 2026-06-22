import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './src/db/index.ts';
import { items, movements, users } from './src/db/schema.ts';
import { eq, sql, desc, and } from 'drizzle-orm';
import { requireAuth, requireRoles, AuthRequest } from './src/middleware/auth.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse incoming request JSON bodies
  app.use(express.json());

  // 0. GET /api/me - Retrieve current authenticated operator info and roles
  app.get('/api/me', requireAuth, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // 1. GET /api/inventory - Retrieve catalog list
  app.get('/api/inventory', requireAuth, async (req, res) => {
    try {
      const list = await db.select().from(items).orderBy(desc(items.updatedAt));
      res.json(list);
    } catch (error) {
      console.error("Database query failed inside GET /api/inventory:", error);
      res.status(500).json({ error: "Failed to retrieve inventory list. Please try again later." });
    }
  });

  // 2. GET /api/inventory/alerts - Retrieve items below safe stock thresholds
  app.get('/api/inventory/alerts', requireAuth, async (req, res) => {
    try {
      const alertedList = await db.select()
        .from(items)
        .where(sql`${items.stock} <= ${items.minStock}`)
        .orderBy(desc(items.updatedAt));
      res.json(alertedList);
    } catch (error) {
      console.error("Database query failed inside GET /api/inventory/alerts:", error);
      res.status(500).json({ error: "Failed to retrieve stock alerts. Please try again later." });
    }
  });

  // 3. POST /api/inventory - Add a new item to catalog (Authorized: admin, manager)
  app.post('/api/inventory', requireAuth, requireRoles(['admin', 'manager']), async (req, res) => {
    const { sku, name, description, category, minStock, unit } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ error: "SKU code and name are required." });
    }

    const cleanSku = sku.trim().toUpperCase();
    if (cleanSku.includes(' ')) {
      return res.status(400).json({ error: "SKU code must not contain space characters." });
    }

    try {
      // Check duplicate
      const duplicates = await db.select().from(items).where(eq(items.sku, cleanSku)).limit(1);
      if (duplicates.length > 0) {
        return res.status(400).json({ error: `An item with SKU code '${cleanSku}' already exists in catalog.` });
      }

      const inserted = await db.insert(items)
        .values({
          sku: cleanSku,
          name: name.trim(),
          description: description ? description.trim() : null,
          category: category ? category.trim() : 'General',
          minStock: isNaN(parseInt(minStock)) ? 5 : Math.max(0, parseInt(minStock)),
          unit: unit ? unit.trim() : 'pcs',
          stock: 0, // Stock modified purely via transaction log entries
        })
        .returning();

      res.status(201).json({ message: "Catalog item listed successfully", item: inserted[0] });
    } catch (error) {
      console.error("Database query failed inside POST /api/inventory:", error);
      res.status(500).json({ error: "Failed to register new item in catalog." });
    }
  });

  // 4. PUT /api/inventory/:id - Update item catalog details (Authorized: admin, manager)
  app.put('/api/inventory/:id', requireAuth, requireRoles(['admin', 'manager']), async (req, res) => {
    const itemId = parseInt(req.params.id);
    const { name, description, category, minStock, unit } = req.body;

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item ID." });
    }

    if (!name) {
      return res.status(400).json({ error: "Item name is required." });
    }

    try {
      const updated = await db.update(items)
        .set({
          name: name.trim(),
          description: description ? description.trim() : null,
          category: category ? category.trim() : 'General',
          minStock: isNaN(parseInt(minStock)) ? 5 : Math.max(0, parseInt(minStock)),
          unit: unit ? unit.trim() : 'pcs',
          updatedAt: new Date(),
        })
        .where(eq(items.id, itemId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "Catalog item not found." });
      }

      res.json({ message: "Catalog item updated successfully", item: updated[0] });
    } catch (error) {
      console.error("Database query failed inside PUT /api/inventory/:id:", error);
      res.status(500).json({ error: "Failed to update catalog details." });
    }
  });

  // 5. DELETE /api/inventory/:id - Remove listed item (Authorized: admin only)
  app.delete('/api/inventory/:id', requireAuth, requireRoles(['admin']), async (req, res) => {
    const itemId = parseInt(req.params.id);

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item ID." });
    }

    try {
      const deleted = await db.delete(items).where(eq(items.id, itemId)).returning();
      if (deleted.length === 0) {
        return res.status(404).json({ error: "Catalog item not found." });
      }
      res.json({ message: "Item deleted from catalog successfully", item: deleted[0] });
    } catch (error) {
      console.error("Database query failed inside DELETE /api/inventory/:id:", error);
      res.status(500).json({ error: "Failed to delete item from catalog." });
    }
  });

  // 6. POST /api/inventory/:id/stock - Adjust stock levels and log movement with full outgoing traceability
  app.post('/api/inventory/:id/stock', requireAuth, async (req: AuthRequest, res) => {
    const itemId = parseInt(req.params.id);
    const { quantity, type, recipient, reason, carrier } = req.body;

    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item ID." });
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({ error: "A positive non-zero quantity is required." });
    }

    if (type !== 'incoming' && type !== 'outgoing') {
      return res.status(400).json({ error: "Movement type must be either 'incoming' or 'outgoing'." });
    }

    const adjustedQty = type === 'incoming' ? qty : -qty;

    try {
      // Find item
      const targetQuery = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
      if (targetQuery.length === 0) {
        return res.status(404).json({ error: "Catalog item not found." });
      }

      const itemRecord = targetQuery[0];
      if (type === 'outgoing' && itemRecord.stock < qty) {
        return res.status(400).json({
          error: `Insufficient stock level. Balance is only ${itemRecord.stock} ${itemRecord.unit}s, but requested ${qty}.`
        });
      }

      const operatorId = req.user?.dbId;
      if (!operatorId) {
        return res.status(400).json({ error: "Operator registration profile not resolved." });
      }

      // Execute atomic transaction for stock update and logging
      const updatedItem = await db.transaction(async (tx) => {
        const u = await tx.update(items)
          .set({
            stock: itemRecord.stock + adjustedQty,
            updatedAt: new Date()
          })
          .where(eq(items.id, itemId))
          .returning();

        await tx.insert(movements)
          .values({
            itemId,
            userId: operatorId,
            quantity: adjustedQty,
            type,
            recipient: type === 'outgoing' ? (recipient ? recipient.trim() : 'Unknown Recipient') : null,
            reason: type === 'outgoing' ? (reason ? reason.trim() : 'Warehouse Distribution') : null,
            carrier: type === 'outgoing' ? (carrier ? carrier.trim() : 'In-House Pickup') : null,
          });

        return u[0];
      });

      res.json({ message: "Stock level updated and logged successfully", item: updatedItem });
    } catch (error) {
      console.error("Database execution failed inside POST /api/inventory/:id/stock:", error);
      res.status(500).json({ error: "Failed to record transaction and synchronize stock level." });
    }
  });

  // 7. GET /api/movements - Fetch traceability log
  app.get('/api/movements', requireAuth, async (req, res) => {
    try {
      const list = await db.select({
        id: movements.id,
        itemId: movements.itemId,
        itemName: items.name,
        itemSku: items.sku,
        quantity: movements.quantity,
        type: movements.type,
        recipient: movements.recipient,
        reason: movements.reason,
        carrier: movements.carrier,
        createdAt: movements.createdAt,
        operatorEmail: users.email,
        operatorRole: users.role,
      })
      .from(movements)
      .innerJoin(items, eq(movements.itemId, items.id))
      .innerJoin(users, eq(movements.userId, users.id))
      .orderBy(desc(movements.createdAt));

      res.json(list);
    } catch (error) {
      console.error("Database query failed inside GET /api/movements:", error);
      res.status(500).json({ error: "Failed to load audit trace logs." });
    }
  });

  // 8. GET /api/movements/stats - Historical logs grouping for dashboard trends
  app.get('/api/movements/stats', requireAuth, async (req, res) => {
    try {
      const daysOffset = 30;
      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - daysOffset);

      const logs = await db.select({
        quantity: movements.quantity,
        type: movements.type,
        createdAt: movements.createdAt
      })
      .from(movements)
      .where(sql`${movements.createdAt} >= ${dateLimit}`)
      .orderBy(movements.createdAt);

      const trendMap: Record<string, { date: string; incoming: number; outgoing: number }> = {};

      // Fill in safe visual defaults for the last 15 days to handle low data
      for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        trendMap[ds] = { date: ds, incoming: 0, outgoing: 0 };
      }

      logs.forEach(l => {
        if (!l.createdAt) return;
        const ds = new Date(l.createdAt).toISOString().split('T')[0];
        if (!trendMap[ds]) {
          trendMap[ds] = { date: ds, incoming: 0, outgoing: 0 };
        }
        const amount = Math.abs(l.quantity);
        if (l.type === 'incoming') {
          trendMap[ds].incoming += amount;
        } else if (l.type === 'outgoing') {
          trendMap[ds].outgoing += amount;
        }
      });

      const trendData = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));
      res.json(trendData);
    } catch (error) {
      console.error("Database aggregation query failed inside GET /api/movements/stats:", error);
      res.status(500).json({ error: "Failed to compute historical stats." });
    }
  });

  // 9. GET /api/users - Fetch user profiles (Authorized: admin only)
  app.get('/api/users', requireAuth, requireRoles(['admin']), async (req, res) => {
    try {
      const allUsers = await db.select().from(users).orderBy(desc(users.id));
      res.json(allUsers);
    } catch (error) {
      console.error("Database query failed inside GET /api/users:", error);
      res.status(500).json({ error: "Failed to load registered accounts." });
    }
  });

  // 10. PUT /api/users/:id/role - Update user roles (Authorized: admin only)
  app.put('/api/users/:id/role', requireAuth, requireRoles(['admin']), async (req: AuthRequest, res) => {
    const userId = parseInt(req.params.id);
    const { role } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (role !== 'admin' && role !== 'manager' && role !== 'staff') {
      return res.status(400).json({ error: "Access role must be either 'admin', 'manager', or 'staff'." });
    }

    if (req.user?.dbId === userId) {
      return res.status(400).json({ error: "Role safety block: You are not authorized to revoke or edit your own administrative privileges." });
    }

    try {
      const updated = await db.update(users)
        .set({ role })
        .where(eq(users.id, userId))
        .returning();

      if (updated.length === 0) {
        return res.status(404).json({ error: "User account profile not found." });
      }

      res.json({ message: `Successfully updated user's role to '${role}'`, user: updated[0] });
    } catch (error) {
      console.error("Database update failed inside PUT /api/users/:id/role:", error);
      res.status(500).json({ error: "Failed to update operator access privilege." });
    }
  });

  // Serve static assets and layout fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server processing requests on port ${PORT}`);
  });
}

startServer();
