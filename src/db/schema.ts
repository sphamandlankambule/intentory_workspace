import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Define the 'users' table mapped to local username/password or Firebase Auth profiles
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Unique identifier
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // salted PBKDF2 hash of local password
  role: text('role').notNull().default('staff'), // 'admin' | 'manager' | 'staff'
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'items' (inventory products) table
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  sku: text('sku').notNull().unique(), // Stock Keeping Unit
  name: text('name').notNull(),
  description: text('description'),
  category: text('category').default('General'),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(5), // Threshold for low-inventory alerts
  unit: text('unit').notNull().default('pcs'), // 'pcs', 'box', 'kg', etc.
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Define the 'movements' table checking full traceability of items
export const movements = pgTable('movements', {
  id: serial('id').primaryKey(),
  itemId: integer('item_id')
    .references(() => items.id, { onDelete: 'cascade' })
    .notNull(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  quantity: integer('quantity').notNull(), // positive for incoming, negative for outgoing
  type: text('type').notNull(), // 'incoming' | 'outgoing'
  recipient: text('recipient'), // outgoing trace: where/whom it went to
  reason: text('reason'), // outgoing trace: reason for distribution
  carrier: text('carrier'), // outgoing trace: shipping carrier
  createdAt: timestamp('created_at').defaultNow(),
});

// Define relationships for the 'users' table
export const usersRelations = relations(users, ({ many }) => ({
  movements: many(movements),
}));

// Define relationships for the 'items' table
export const itemsRelations = relations(items, ({ many }) => ({
  movements: many(movements),
}));

// Define relationships for the 'movements' table
export const movementsRelations = relations(movements, ({ one }) => ({
  item: one(items, {
    fields: [movements.itemId],
    references: [items.id],
  }),
  operator: one(users, {
    fields: [movements.userId],
    references: [users.id],
  }),
}));
