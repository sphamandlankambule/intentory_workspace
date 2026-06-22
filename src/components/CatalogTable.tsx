import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Edit, Trash2, ArrowUpDown, Search, Filter, 
  HelpCircle, CheckCircle, AlertTriangle, AlertCircle, Loader2 
} from 'lucide-react';
import { InventoryItem } from '../types.ts';

interface CatalogProps {
  items: InventoryItem[];
  userRole: 'admin' | 'manager' | 'staff';
  token: string | null;
  onRefresh: () => void;
}

export const CatalogTable: React.FC<CatalogProps> = ({ items, userRole, token, onRefresh }) => {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [alertFilter, setAlertFilter] = useState('All'); // 'All' | 'Alerts' | 'Normal'

  // Modals Active Indices
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustmentItem, setAdjustmentItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form states - Create Product SKU
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Form states - Edit Product SKU
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editMinStock, setEditMinStock] = useState('5');
  const [editUnit, setEditUnit] = useState('pcs');

  // Form states - Adjust Stock
  const [adjQty, setAdjQty] = useState('1');
  const [adjType, setAdjType] = useState<'incoming' | 'outgoing'>('incoming');
  const [adjRecipient, setAdjRecipient] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjCarrier, setAdjCarrier] = useState('');

  // Categories extracted from products list
  const categories = ['All', ...Array.from(new Set(items.map(item => item.category)))];

  // Filter Logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    
    const isAlerting = item.stock <= item.minStock;
    const matchesAlert = alertFilter === 'All' || 
                        (alertFilter === 'Alerts' && isAlerting) ||
                        (alertFilter === 'Normal' && !isAlerting);

    return matchesSearch && matchesCategory && matchesAlert;
  });

  // Action: Create catalog item
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sku,
          name,
          description,
          category: category || 'General',
          minStock: parseInt(minStock),
          unit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to list item');
      }

      onRefresh();
      setIsCreateModalOpen(false);
      // reset states
      setSku('');
      setName('');
      setDescription('');
      setCategory('');
      setMinStock('5');
      setUnit('pcs');
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Action: Setup edit modal
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setEditName(item.name);
    setEditDescription(item.description || '');
    setEditCategory(item.category);
    setEditMinStock(item.minStock.toString());
    setEditUnit(item.unit);
    setFormError('');
  };

  // Action: Save edits
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !token) return;
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          category: editCategory,
          minStock: parseInt(editMinStock),
          unit: editUnit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save edits');
      }

      onRefresh();
      setEditingItem(null);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Action: Delete item (admin only)
  const handleDeleteProduct = async (id: number) => {
    if (!token) return;
    try {
      setFormLoading(true);
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete');
      }
      onRefresh();
      setDeletingId(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // Action: Setup stock adj modal
  const openAdjustmentModal = (item: InventoryItem) => {
    setAdjustmentItem(item);
    setAdjQty('1');
    setAdjType('incoming');
    setAdjRecipient('');
    setAdjReason('');
    setAdjCarrier('');
    setFormError('');
  };

  // Action: Commit stock log
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentItem || !token) return;
    setFormLoading(true);
    setFormError('');

    try {
      const res = await fetch(`/api/inventory/${adjustmentItem.id}/stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quantity: parseInt(adjQty),
          type: adjType,
          recipient: adjType === 'outgoing' ? adjRecipient : null,
          reason: adjType === 'outgoing' ? adjReason : null,
          carrier: adjType === 'outgoing' ? adjCarrier : null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Adjustment failed');
      }

      onRefresh();
      setAdjustmentItem(null);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
      
      {/* Header and filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold font-sans text-gray-900">Inventory Catalog</h3>
          <p className="text-xs text-slate-400">Manage products SKU listing and physical stock updates on the go</p>
        </div>
        
        {/* Buttons for admin/manager */}
        {['admin', 'manager'].includes(userRole) && (
          <button
            id="btn-create-product"
            onClick={() => setIsCreateModalOpen(true)}
            className="self-start md:self-auto inline-flex items-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-mono py-2.5 px-4 rounded-xl cursor-pointer transition-colors shadow-sm shadow-indigo-500/10"
          >
            <Plus className="w-4 h-4" />
            CREATE PRODUCT SKU
          </button>
        )}
      </div>

      {/* Responsive Filters Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/60">
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            id="input-catalog-search"
            type="text"
            placeholder="Search by SKU or Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden focus:border-slate-400 placeholder:text-gray-400"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-gray-400">Category:</span>
          <select
            id="select-catalog-category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Alert filter */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-mono text-gray-400">Stock State:</span>
          <select
            id="select-catalog-alert"
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
          >
            <option value="All">All Levels</option>
            <option value="Alerts">⚠️ Low Stock Alerts</option>
            <option value="Normal">✅ Normal Levels</option>
          </select>
        </div>

        {/* Count result summary */}
        <div className="flex items-center justify-end text-right">
          <p className="text-xs font-mono text-gray-400">
            Showing <strong className="text-slate-700">{filteredItems.length}</strong> items
          </p>
        </div>
      </div>

      {/* Catalog items table list (Responsive on mobile!) */}
      <div className="overflow-x-auto -mx-5 sm:-mx-6">
        <div className="inline-block min-w-full align-middle">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">SKU</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Product Info</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Category</th>
                <th scope="col" className="px-5 py-3 text-left text-[11px] font-mono uppercase text-gray-400 tracking-wider">Status & Stock</th>
                <th scope="col" className="px-5 py-3 scope-right text-right text-[11px] font-mono uppercase text-gray-400 tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-xs">
                    No items in catalog match search or filter rules.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.stock <= item.minStock;
                  return (
                    <tr key={item.id} id={`row-${item.sku}`} className="hover:bg-slate-50/50 transition-colors">
                      {/* SKU */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs font-mono font-medium text-slate-800">
                        {item.sku}
                      </td>
                      
                      {/* Name and desc */}
                      <td className="px-5 py-4">
                        <div className="text-xs font-semibold text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{item.description}</div>
                        )}
                      </td>

                      {/* Category badge */}
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                        <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-sm font-sans uppercase">
                          {item.category}
                        </span>
                      </td>

                      {/* Stock level */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <strong className={`font-mono text-xs ${isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                            {item.stock} {item.unit}
                          </strong>
                          {isLow ? (
                            <span className="inline-flex items-center gap-1 text-[10px] border border-amber-200 bg-amber-50 text-amber-700 font-sans px-1.5 py-0.5 rounded-sm">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                              Low Stock threshold ({item.minStock})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] border border-emerald-100 bg-emerald-50/50 text-emerald-700 font-sans px-1.5 py-0.5 rounded-sm">
                              Healthy state
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-right text-xs font-medium space-x-1">
                        
                        {/* Adjust Stock (Open for all warehouse staff) */}
                        <button
                          id={`btn-adj-${item.sku}`}
                          onClick={() => openAdjustmentModal(item)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors"
                        >
                          <ArrowUpDown className="w-3 h-3" />
                          ADJUST STOCK
                        </button>

                        {/* Edit details (Manager and above) */}
                        {['admin', 'manager'].includes(userRole) && (
                          <button
                            id={`btn-edit-${item.sku}`}
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1.5 rounded-sm cursor-pointer transition-colors"
                          >
                            <Edit className="w-3 h-3" />
                            EDIT
                          </button>
                        )}

                        {/* Delete product (Admin only) */}
                        {userRole === 'admin' && (
                          <button
                            id={`btn-del-${item.sku}`}
                            onClick={() => setDeletingId(item.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 hover:bg-rose-50 px-2 py-1.5 rounded-sm cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL 1: CREATE SKU PRODUCT --- */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-md p-6 relative overflow-hidden"
            >
              <h4 className="text-base font-semibold text-gray-900 font-sans mb-1">Create Warehouse SKU Product</h4>
              <p className="text-xs text-gray-400 mb-5">Ensure full item specification before adding to stock tracking system.</p>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleCreateProduct} className="space-y-4">
                
                {/* SKU Code */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">SKU identifier (Unique, no spaces) *</label>
                  <input
                    type="text"
                    required
                    maxLength={15}
                    placeholder="e.g. LAP-MAC-PRO"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono uppercase text-gray-800 focus:outline-hidden focus:border-slate-400"
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">Max 15 chars, alphanumeric code only.</p>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apple MacBook Pro 14"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Description</label>
                  <textarea
                    placeholder="Provide storage location or details..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden h-16"
                  />
                </div>

                {/* Double stats: Category & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Category</label>
                    <input
                      type="text"
                      placeholder="e.g. Electronics"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Stock Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                    >
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="box">box (Boxes)</option>
                      <option value="kg">kg (Kilograms)</option>
                      <option value="unit">unit (Units)</option>
                      <option value="pack">pack (Packs)</option>
                    </select>
                  </div>
                </div>

                {/* Min stock for alerts */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Minimum Alert Threshold *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">Automated visual alert flag is raised below this quantity balance.</p>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="bg-slate-100 text-gray-600 hover:bg-slate-200 text-xs font-mono py-2 px-4 rounded-lg cursor-pointer transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    CREATE SKU
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 2: EDIT CATALOG PRODUCT --- */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-md p-6 relative overflow-hidden"
            >
              <h4 className="text-base font-semibold text-gray-900 font-sans mb-1">Edit Catalog Product specifications</h4>
              <p className="text-xs text-gray-400 mb-2">Changing SKU ID is restricted. Modify details for <span className="font-mono bg-slate-100 px-1 rounded-sm text-slate-800">{editingItem.sku}</span>.</p>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleEditProduct} className="space-y-4 mt-3">
                
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Description</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden h-16"
                  />
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Category</label>
                    <input
                      type="text"
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Stock Unit</label>
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                    >
                      <option value="pcs">pcs (Pieces)</option>
                      <option value="box">box (Boxes)</option>
                      <option value="kg">kg (Kilograms)</option>
                      <option value="unit">unit (Units)</option>
                      <option value="pack">pack (Packs)</option>
                    </select>
                  </div>
                </div>

                {/* Min stock */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Minimum Alert Threshold *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editMinStock}
                    onChange={(e) => setEditMinStock(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="bg-slate-100 text-gray-600 hover:bg-slate-200 text-xs font-mono py-2 px-4 rounded-lg cursor-pointer transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    SAVE EDITS
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 3: ADJUST STOCK (LEDGER REPORT WITH FULL OUTGOING TRACEABILITY) --- */}
      <AnimatePresence>
        {adjustmentItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-md p-6 relative overflow-hidden"
            >
              <h4 className="text-base font-semibold text-gray-900 font-sans mb-1">Adjust Warehouse Stock Level</h4>
              <p className="text-xs text-gray-400 mb-4 font-sans">
                Logging operations for <span className="font-mono bg-slate-100 text-slate-800 px-1 py-0.5 rounded-sm">{adjustmentItem.sku}</span> ({adjustmentItem.name}). 
                Current on-hand stock: <strong className="text-slate-800 font-mono">{adjustmentItem.stock} {adjustmentItem.unit}</strong>
              </p>

              {formError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleStockAdjustment} className="space-y-4">
                
                {/* Movement Type Selector */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-150">
                  <button
                    type="button"
                    onClick={() => setAdjType('incoming')}
                    className={`text-xs font-mono font-bold py-2 rounded-md ${adjType === 'incoming' ? 'bg-white text-emerald-700 border border-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    🟢 STOCK INCOMING
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('outgoing')}
                    className={`text-xs font-mono font-bold py-2 rounded-md ${adjType === 'outgoing' ? 'bg-white text-rose-700 border border-slate-100 shadow-xs' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    🔴 STOCK OUTGOING
                  </button>
                </div>

                {/* Adjustment Quantity */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Adjustment Quantity ({adjustmentItem.unit}) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjQty}
                    onChange={(e) => setAdjQty(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                  />
                  <p className="text-[9px] text-gray-400 mt-0.5">Report actual physically received or distributed item quantity.</p>
                </div>

                {/* TRACEABILITY FIELDS (Only shown for outgoing type!) */}
                {adjType === 'outgoing' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3 pt-3 border-t border-slate-100"
                  >
                    <p className="text-[10px] text-amber-600 bg-amber-50/50 border border-amber-100 p-2 rounded-sm font-sans flex items-center gap-1.5 leading-relaxed">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Traceability safeguard: Distribution particulars must be fully recorded.
                    </p>

                    {/* Where it went / Recipient */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Recipient / Destination *</label>
                      <input
                        type="text"
                        required={adjType === 'outgoing'}
                        placeholder="e.g. London Office Retailer Subgroup"
                        value={adjRecipient}
                        onChange={(e) => setAdjRecipient(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                      />
                    </div>

                    {/* Reason for distribution */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Reason for Distribution *</label>
                      <input
                        type="text"
                        required={adjType === 'outgoing'}
                        placeholder="e.g. Resell stock supply order"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                      />
                    </div>

                    {/* shipping carrier */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-gray-400 mb-1">Shipping Carrier Info *</label>
                      <input
                        type="text"
                        required={adjType === 'outgoing'}
                        placeholder="e.g. DHL Express Air, Track: DHL-58219"
                        value={adjCarrier}
                        onChange={(e) => setAdjCarrier(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-gray-800 focus:outline-hidden"
                      />
                    </div>
                  </motion.div>
                )}

                {/* Action buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setAdjustmentItem(null)}
                    className="bg-slate-100 text-gray-600 hover:bg-slate-200 text-xs font-mono py-2 px-4 rounded-lg cursor-pointer transition-colors"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={formLoading}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    RECORD ADJUSTMENT
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL 4: DELETE CONFIRMATION --- */}
      <AnimatePresence>
        {deletingId !== null && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl border border-gray-100 w-full max-w-sm p-6 relative overflow-hidden space-y-4"
            >
              <div className="text-rose-600 bg-rose-50 p-3 rounded-full w-min mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h4 className="text-sm font-semibold text-gray-900 font-sans mb-1">Delete listed Catalog Item?</h4>
                <p className="text-xs text-gray-400">This action is permanent and deletes all associated movement logs as well.</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="bg-slate-100 text-gray-600 hover:bg-slate-200 text-xs font-mono py-2 px-4 rounded-lg cursor-pointer transition-colors"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => handleDeleteProduct(deletingId)}
                  disabled={formLoading}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono py-2 px-4 rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  PERMANENTLY DELETE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
