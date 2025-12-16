'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Package,
  AlertTriangle,
  XCircle,
  DollarSign,
  Search,
  TrendingUp,
  Download
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: string;
  name: string;
  description: string | null;
  sku: string;
  category_id: string;
  stock_quantity: number;
  price: number;
  image_url: string | null;
  category: {
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  count: number;
}

export default function StockPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const itemsPerPage = 10;

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    sku: '',
    category_id: '',
    stock_quantity: 0,
    price: 0,
    low_stock_threshold: 10,
  });

  useEffect(() => {
    if (tenantId) {
      fetchProducts();
      fetchCategories();
    }
  }, [tenantId]);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(name)')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    setFilteredProducts(filtered);
    setCurrentPage(1);
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.sku || !newProduct.category_id) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!tenantId) return;

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          ...newProduct,
          tenant_id: tenantId,
        } as any);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product added successfully',
      });

      setShowAddDialog(false);
      setNewProduct({
        name: '',
        description: '',
        sku: '',
        category_id: '',
        stock_quantity: 0,
        price: 0,
        low_stock_threshold: 10,
      });
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: 'Error',
        description: 'Failed to add product',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Product deleted successfully',
      });
      fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
    }
  };

  const stats = {
    totalProducts: products.length,
    lowStock: products.filter(p => (p.stock_quantity ?? 0) > 0 && (p.stock_quantity ?? 0) <= 10).length,
    outOfStock: products.filter(p => (p.stock_quantity ?? 0) === 0).length,
    totalValue: products.reduce((sum, p) => sum + ((p.price ?? 0) * (p.stock_quantity ?? 0)), 0),
  };

  const stockTrendData = [
    { date: 'Jan 1', value: 1150 },
    { date: 'Jan 8', value: 1200 },
    { date: 'Jan 15', value: 1180 },
    { date: 'Jan 22', value: 1250 },
    { date: 'Jan 29', value: 1220 },
    { date: 'Feb 5', value: 1280 },
    { date: 'Feb 12', value: 1240 },
    { date: 'Feb 19', value: 1290 },
    { date: 'Feb 26', value: 1247 },
  ];

  const categoryDistribution = categories.map(cat => ({
    name: cat.name,
    value: products.filter(p => p.category_id === cat.id).length,
  })).filter(cat => cat.value > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981'];

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const getStatusColor = (stock: number | null | undefined) => {
    const qty = stock ?? 0;
    if (qty === 0) return 'bg-red-100 text-red-700';
    if (qty <= 10) return 'bg-orange-100 text-orange-700';
    return 'bg-green-100 text-green-700';
  };

  const getStatusText = (stock: number | null | undefined) => {
    const qty = stock ?? 0;
    if (qty === 0) return 'Out of Stock';
    if (qty <= 10) return 'Low Stock';
    return 'In Stock';
  };

  const exportToCSV = () => {
    const headers = ['Product', 'SKU', 'Category', 'Stock Level', 'Price', 'Status'];
    const rows = filteredProducts.map(p => [
      p.name,
      p.sku,
      p.category?.name || '',
      p.stock_quantity ?? 0,
      (p.price ?? 0).toFixed(2),
      getStatusText(p.stock_quantity),
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory.csv';
    a.click();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stock Management</h1>
            <p className="text-slate-600 mt-1">Manage your inventory and track stock levels</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600 font-medium">Total Products</p>
              <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.totalProducts}</p>
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              8.2% vs last month
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600 font-medium">Low Stock Items</p>
              <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.lowStock}</p>
            <p className="text-xs text-orange-600 mt-2 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Requires attention
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600 font-medium">Out of Stock</p>
              <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">{stats.outOfStock}</p>
            <p className="text-xs text-red-600 mt-2 flex items-center">
              <XCircle className="h-3 w-3 mr-1" />
              Urgent restock
            </p>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600 font-medium">Total Value</p>
              <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">£{stats.totalValue.toFixed(0)}</p>
            <p className="text-xs text-green-600 mt-2 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              8.2% vs last month
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-900">Stock Levels Over Time</h2>
              <Select defaultValue="30">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stockTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Category Distribution</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200">
          <div className="p-6 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Product Inventory</h2>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Stock Level</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {paginatedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Package className="h-5 w-5 text-slate-400" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{product.name}</p>
                          <p className="text-xs text-slate-500">{product.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900">{product.sku}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{product.category?.name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{product.stock_quantity ?? 0} units</td>
                    <td className="px-6 py-4 text-sm text-slate-900">£{(product.price ?? 0).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(product.stock_quantity)}`}>
                        {getStatusText(product.stock_quantity)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  Previous
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    variant={currentPage === i + 1 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(i + 1)}
                    className={currentPage === i + 1 ? 'bg-blue-600 hover:bg-blue-700' : ''}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Product Name *</Label>
              <Input
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                placeholder="Enter product name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder="Enter description"
              />
            </div>
            <div>
              <Label>SKU *</Label>
              <Input
                value={newProduct.sku}
                onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                placeholder="Enter SKU"
              />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={newProduct.category_id} onValueChange={(value) => setNewProduct({ ...newProduct, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={newProduct.stock_quantity}
                onChange={(e) => setNewProduct({ ...newProduct, stock_quantity: parseInt(e.target.value) || 0 })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Price</Label>
              <Input
                type="number"
                step="0.01"
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddProduct} className="bg-blue-600 hover:bg-blue-700">Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
