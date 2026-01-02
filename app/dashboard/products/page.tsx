'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Grid3x3, List, Download, Edit, Trash2, Printer, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BarcodeDisplay } from '@/components/BarcodeDisplay';

type Product = {
  id: string;
  sku: string;
  barcode?: string;
  auto_generate_barcode?: boolean;
  name: string;
  subtitle?: string;
  description?: string;
  category?: string;
  category_id?: string;
  price_per_unit: number;
  stock_quantity: number;
  stock_status: string;
  image_url?: string;
  is_favourite: boolean;
  favourite_priority: number;
  is_active: boolean;
  is_weight_based: boolean;
  weight_unit: string;
  min_quantity_step: number;
};

type Category = {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  display_order: number;
  is_active: boolean;
  is_favourite: boolean;
  favourite_priority: number;
};

export default function ProductsPage() {
  const { tenantId, showDemoProducts } = useTenant();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStockStatus, setSelectedStockStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [showEditProductDialog, setShowEditProductDialog] = useState(false);
  const [showAddCategoryDialog, setShowAddCategoryDialog] = useState(false);
  const [showEditCategoryDialog, setShowEditCategoryDialog] = useState(false);
  const [showPrintLabelDialog, setShowPrintLabelDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [printingProduct, setPrintingProduct] = useState<Product | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: 'product' | 'category';
    id: string;
    name: string;
  }>({ open: false, type: 'product', id: '', name: '' });

  const [productForm, setProductForm] = useState({
    name: '',
    subtitle: '',
    sku: '',
    barcode: '',
    auto_generate_barcode: true,
    description: '',
    category_id: '',
    price_per_unit: '',
    stock_quantity: '',
    stock_status: 'in_stock',
    is_favourite: false,
    favourite_priority: 0,
    image_url: '',
    is_weight_based: false,
    weight_unit: 'kg',
    min_quantity_step: 0.1,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image_url: '',
    display_order: 0,
    is_favourite: false,
    favourite_priority: 0,
  });

  useEffect(() => {
    if (!userProfile) {
      router.push('/login');
      return;
    }
    if (tenantId) {
      loadProducts();
      loadCategories();
    }
  }, [tenantId, userProfile]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, selectedCategory, selectedStockStatus, sortBy]);

  const loadProducts = async () => {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      console.error('Error loading products:', error);
      return;
    }

    setProducts(data || []);
  };

  const loadCategories = async () => {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('display_order');

    if (error) {
      console.error('Error loading categories:', error);
      return;
    }

    setCategories(data || []);
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    if (selectedStockStatus !== 'all') {
      filtered = filtered.filter(p => p.stock_status === selectedStockStatus);
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return a.price_per_unit - b.price_per_unit;
        case 'stock':
          return b.stock_quantity - a.stock_quantity;
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleAddProduct = async () => {
    if (!tenantId || !productForm.name || !productForm.sku) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await (supabase as any)
      .from('products')
      .insert({
        tenant_id: tenantId,
        name: productForm.name,
        subtitle: productForm.subtitle,
        sku: productForm.sku,
        barcode: productForm.barcode || null,
        auto_generate_barcode: productForm.auto_generate_barcode,
        description: productForm.description,
        category_id: productForm.category_id || null,
        price_per_unit: parseFloat(productForm.price_per_unit) || 0,
        stock_quantity: parseFloat(productForm.stock_quantity) || 0,
        stock_status: productForm.stock_status,
        is_favourite: productForm.is_favourite,
        favourite_priority: productForm.favourite_priority,
        image_url: productForm.image_url || null,
        is_weight_based: productForm.is_weight_based,
        weight_unit: productForm.weight_unit,
        min_quantity_step: productForm.min_quantity_step,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add product',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Product added successfully',
    });

    setShowAddProductDialog(false);
    resetProductForm();
    loadProducts();
  };

  const handleEditProduct = async () => {
    if (!editingProduct) return;

    const { error } = await (supabase as any)
      .from('products')
      .update({
        name: productForm.name,
        subtitle: productForm.subtitle,
        sku: productForm.sku,
        barcode: productForm.barcode || null,
        auto_generate_barcode: productForm.auto_generate_barcode,
        description: productForm.description,
        category_id: productForm.category_id || null,
        price_per_unit: parseFloat(productForm.price_per_unit) || 0,
        stock_quantity: parseFloat(productForm.stock_quantity) || 0,
        stock_status: productForm.stock_status,
        is_favourite: productForm.is_favourite,
        favourite_priority: productForm.favourite_priority,
        image_url: productForm.image_url || null,
        is_weight_based: productForm.is_weight_based,
        weight_unit: productForm.weight_unit,
        min_quantity_step: productForm.min_quantity_step,
      })
      .eq('id', editingProduct.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update product',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Product updated successfully',
    });

    setShowEditProductDialog(false);
    setEditingProduct(null);
    resetProductForm();
    loadProducts();
  };

  const confirmDeleteProduct = (product: Product) => {
    setDeleteConfirm({
      open: true,
      type: 'product',
      id: product.id,
      name: product.name,
    });
  };

  const handleDeleteProduct = async () => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deleteConfirm.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete product',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Product deleted successfully',
    });

    setDeleteConfirm({ open: false, type: 'product', id: '', name: '' });
    loadProducts();
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    if (!confirm(`Delete ${selectedProducts.length} products?`)) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .in('id', selectedProducts);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete products',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: `${selectedProducts.length} products deleted`,
    });

    setSelectedProducts([]);
    loadProducts();
  };

  const handleAddCategory = async () => {
    if (!tenantId || !categoryForm.name) {
      toast({
        title: 'Validation Error',
        description: 'Category name is required',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await (supabase as any)
      .from('categories')
      .insert({
        tenant_id: tenantId,
        name: categoryForm.name,
        description: categoryForm.description,
        image_url: categoryForm.image_url || null,
        display_order: categoryForm.display_order,
        is_favourite: categoryForm.is_favourite,
        favourite_priority: categoryForm.favourite_priority,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add category',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Category added successfully',
    });

    setShowAddCategoryDialog(false);
    resetCategoryForm();
    loadCategories();
  };

  const handleEditCategory = async () => {
    if (!editingCategory) return;

    const { error } = await (supabase as any)
      .from('categories')
      .update({
        name: categoryForm.name,
        description: categoryForm.description,
        image_url: categoryForm.image_url || null,
        display_order: categoryForm.display_order,
        is_favourite: categoryForm.is_favourite,
        favourite_priority: categoryForm.favourite_priority,
      })
      .eq('id', editingCategory.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update category',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Category updated successfully',
    });

    setShowEditCategoryDialog(false);
    setEditingCategory(null);
    resetCategoryForm();
    loadCategories();
  };

  const confirmDeleteCategory = (category: Category) => {
    const productCount = products.filter(p => p.category_id === category.id).length;
    const message = productCount > 0
      ? `This category has ${productCount} products. Products will not be deleted, but will lose their category assignment.`
      : 'This action cannot be undone.';

    setDeleteConfirm({
      open: true,
      type: 'category',
      id: category.id,
      name: `${category.name}. ${message}`,
    });
  };

  const handleDeleteCategory = async () => {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', deleteConfirm.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Category deleted successfully',
    });

    setDeleteConfirm({ open: false, type: 'category', id: '', name: '' });
    loadCategories();
    loadProducts();
  };

  const resetProductForm = () => {
    setProductForm({
      name: '',
      subtitle: '',
      sku: '',
      barcode: '',
      auto_generate_barcode: true,
      description: '',
      category_id: '',
      price_per_unit: '',
      stock_quantity: '',
      stock_status: 'in_stock',
      is_favourite: false,
      favourite_priority: 0,
      image_url: '',
      is_weight_based: false,
      weight_unit: 'kg',
      min_quantity_step: 0.1,
    });
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      image_url: '',
      display_order: 0,
      is_favourite: false,
      favourite_priority: 0,
    });
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      subtitle: product.subtitle || '',
      sku: product.sku,
      barcode: product.barcode || '',
      auto_generate_barcode: product.auto_generate_barcode ?? true,
      description: product.description || '',
      category_id: product.category_id || '',
      price_per_unit: product.price_per_unit.toString(),
      stock_quantity: product.stock_quantity.toString(),
      stock_status: product.stock_status,
      is_favourite: product.is_favourite,
      favourite_priority: product.favourite_priority,
      image_url: product.image_url || '',
      is_weight_based: product.is_weight_based || false,
      weight_unit: product.weight_unit || 'kg',
      min_quantity_step: product.min_quantity_step || 0.1,
    });
    setShowEditProductDialog(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
      image_url: category.image_url || '',
      display_order: category.display_order,
      is_favourite: category.is_favourite || false,
      favourite_priority: category.favourite_priority || 0,
    });
    setShowEditCategoryDialog(true);
  };

  const openPrintLabel = (product: Product) => {
    setPrintingProduct(product);
    setShowPrintLabelDialog(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const getStockStatusBadge = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-800">In Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-800">Out of Stock</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getPriceDisplay = (product: Product) => {
    if (product.is_weight_based) {
      return `£${product.price_per_unit.toFixed(2)} / ${product.weight_unit}`;
    }
    return `£${product.price_per_unit.toFixed(2)}`;
  };

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const ProductFormFields = useCallback(() => (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Product Name *</Label>
          <Input
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            placeholder="Enter product name"
          />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Input
            value={productForm.subtitle}
            onChange={(e) => setProductForm({ ...productForm, subtitle: e.target.value })}
            placeholder="Short description"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>SKU *</Label>
          <Input
            value={productForm.sku}
            onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
            placeholder="Product SKU"
          />
        </div>
        <div>
          <Label>Category</Label>
          <Select value={productForm.category_id} onValueChange={(v) => setProductForm({ ...productForm, category_id: v })}>
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
      </div>

      <div className="border-t pt-4">
        <Label className="font-semibold">Barcode</Label>
        <div className="mt-2 space-y-2">
          <Input
            value={productForm.barcode}
            onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })}
            placeholder="Scan or type barcode"
          />
          <div className="flex items-center gap-2">
            <Checkbox
              checked={productForm.auto_generate_barcode}
              onCheckedChange={(checked) => setProductForm({ ...productForm, auto_generate_barcode: checked as boolean })}
            />
            <Label className="text-sm text-slate-600">Auto-generate barcode if empty</Label>
          </div>
        </div>
      </div>

      <div>
        <Label>Description</Label>
        <Textarea
          value={productForm.description}
          onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
          placeholder="Product description"
          rows={3}
        />
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <Label className="font-semibold">Sell by weight (loose item)</Label>
          <Switch
            checked={productForm.is_weight_based}
            onCheckedChange={(checked) => setProductForm({ ...productForm, is_weight_based: checked })}
          />
        </div>

        {productForm.is_weight_based && (
          <div className="grid grid-cols-3 gap-4 pl-4 border-l-2 border-blue-200">
            <div>
              <Label>Weight Unit</Label>
              <Select value={productForm.weight_unit} onValueChange={(v) => setProductForm({ ...productForm, weight_unit: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="g">Grams (g)</SelectItem>
                  <SelectItem value="lb">Pounds (lb)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price per {productForm.weight_unit}</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.price_per_unit}
                onChange={(e) => setProductForm({ ...productForm, price_per_unit: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Min. Step ({productForm.weight_unit})</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.min_quantity_step}
                onChange={(e) => setProductForm({ ...productForm, min_quantity_step: parseFloat(e.target.value) || 0.1 })}
                placeholder="0.1"
              />
            </div>
          </div>
        )}

        {!productForm.is_weight_based && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Price *</Label>
              <Input
                type="number"
                step="0.01"
                value={productForm.price_per_unit}
                onChange={(e) => setProductForm({ ...productForm, price_per_unit: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={productForm.stock_quantity}
                onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div>
              <Label>Stock Status</Label>
              <Select value={productForm.stock_status} onValueChange={(v) => setProductForm({ ...productForm, stock_status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      <div>
        <Label>Image URL (optional)</Label>
        <Input
          value={productForm.image_url}
          onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
          placeholder="https://example.com/image.jpg"
        />
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={productForm.is_favourite}
            onCheckedChange={(checked) => setProductForm({ ...productForm, is_favourite: checked })}
          />
          <Label>Mark as Favourite Product</Label>
        </div>
        {productForm.is_favourite && (
          <div className="flex items-center gap-2">
            <Label>Priority</Label>
            <Input
              type="number"
              className="w-20"
              value={productForm.favourite_priority}
              onChange={(e) => setProductForm({ ...productForm, favourite_priority: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        )}
      </div>
    </div>
  ), [productForm, categories]);

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Products</h1>
            <p className="text-sm text-slate-500">Dashboard &gt; Products</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
            <Button onClick={() => setShowAddProductDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        <Tabs defaultValue="products" className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
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

                <Select value={selectedStockStatus} onValueChange={setSelectedStockStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Stock Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock Status</SelectItem>
                    <SelectItem value="in_stock">In Stock</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sort by Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Sort by Name</SelectItem>
                    <SelectItem value="price">Sort by Price</SelectItem>
                    <SelectItem value="stock">Sort by Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {selectedProducts.length > 0 && (
              <div className="flex items-center justify-between bg-slate-50 border rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedProducts.length === filteredProducts.length}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({filteredProducts.length} products)
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Bulk Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}

            <div className="border rounded-lg overflow-hidden bg-white">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-4 text-left">
                      <Checkbox
                        checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 text-left text-sm font-medium text-slate-700">PRODUCT</th>
                    <th className="p-4 text-left text-sm font-medium text-slate-700">SKU</th>
                    <th className="p-4 text-left text-sm font-medium text-slate-700">CATEGORY</th>
                    <th className="p-4 text-left text-sm font-medium text-slate-700">PRICE</th>
                    <th className="p-4 text-left text-sm font-medium text-slate-700">STOCK</th>
                    <th className="p-4 text-left text-sm font-medium text-slate-700">STATUS</th>
                    <th className="p-4 text-left text-sm font-medium text-slate-700">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedProducts.map((product) => {
                    const category = categories.find(c => c.id === product.category_id);
                    return (
                      <tr key={product.id} className="border-b hover:bg-slate-50">
                        <td className="p-4">
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                              {product.image_url ? (
                                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-slate-400 text-xs">No img</span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{product.name}</span>
                                {product.is_favourite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                                {product.is_weight_based && (
                                  <Badge variant="outline" className="text-xs">By Weight</Badge>
                                )}
                              </div>
                              {product.subtitle && (
                                <div className="text-sm text-slate-500">{product.subtitle}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{product.sku}</td>
                        <td className="p-4 text-sm">{category?.name || '-'}</td>
                        <td className="p-4 text-sm font-medium">{getPriceDisplay(product)}</td>
                        <td className="p-4 text-sm">
                          {product.is_weight_based ? `Stock by ${product.weight_unit}` : product.stock_quantity}
                        </td>
                        <td className="p-4">{getStockStatusBadge(product.stock_status)}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openPrintLabel(product)}>
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => openEditDialog(product)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => confirmDeleteProduct(product)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  );
                })}
                {totalPages > 5 && <span className="px-2">...</span>}
                {totalPages > 5 && (
                  <Button
                    variant={currentPage === totalPages ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Product Categories</h2>
              <Button onClick={() => setShowAddCategoryDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => {
                const productCount = products.filter(p => p.category_id === category.id).length;
                return (
                  <div key={category.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {category.image_url ? (
                          <img src={category.image_url} alt={category.name} className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-100 rounded flex items-center justify-center">
                            <span className="text-slate-400 text-xs">No img</span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{category.name}</h3>
                            {category.is_favourite && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                          </div>
                          <p className="text-sm text-slate-500">{productCount} products</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditCategoryDialog(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteCategory(category)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    {category.description && (
                      <p className="text-sm text-slate-600">{category.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <ProductFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddProductDialog(false)}>Cancel</Button>
              <Button onClick={handleAddProduct}>Add Product</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditProductDialog} onOpenChange={setShowEditProductDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <ProductFormFields />
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditProductDialog(false)}>Cancel</Button>
              <Button onClick={handleEditProduct}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddCategoryDialog} onOpenChange={setShowAddCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Category Name *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Category description"
                  rows={3}
                />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input
                  value={categoryForm.image_url}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={categoryForm.is_favourite}
                    onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_favourite: checked })}
                  />
                  <Label>Mark as Favourite Category</Label>
                </div>
                {categoryForm.is_favourite && (
                  <div className="flex items-center gap-2">
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      className="w-20"
                      value={categoryForm.favourite_priority}
                      onChange={(e) => setCategoryForm({ ...categoryForm, favourite_priority: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddCategoryDialog(false)}>Cancel</Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditCategoryDialog} onOpenChange={setShowEditCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4">
              <div>
                <Label>Category Name *</Label>
                <Input
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  placeholder="Enter category name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="Category description"
                  rows={3}
                />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input
                  value={categoryForm.image_url}
                  onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div>
                <Label>Display Order</Label>
                <Input
                  type="number"
                  value={categoryForm.display_order}
                  onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between border-t pt-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={categoryForm.is_favourite}
                    onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, is_favourite: checked })}
                  />
                  <Label>Mark as Favourite Category</Label>
                </div>
                {categoryForm.is_favourite && (
                  <div className="flex items-center gap-2">
                    <Label>Priority</Label>
                    <Input
                      type="number"
                      className="w-20"
                      value={categoryForm.favourite_priority}
                      onChange={(e) => setCategoryForm({ ...categoryForm, favourite_priority: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditCategoryDialog(false)}>Cancel</Button>
              <Button onClick={handleEditCategory}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showPrintLabelDialog} onOpenChange={setShowPrintLabelDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Print Product Label</DialogTitle>
            </DialogHeader>
            {printingProduct && (
              <div className="space-y-4">
                <div className="border-2 border-dashed p-6 text-center bg-white print-label">
                  <div className="mb-4">
                    <BarcodeDisplay value={printingProduct.barcode || ''} />
                  </div>
                  <div className="text-lg font-bold mb-2">{printingProduct.name}</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {getPriceDisplay(printingProduct)}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{printingProduct.barcode}</div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPrintLabelDialog(false)}>Close</Button>
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print Label
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={deleteConfirm.open}
          onOpenChange={(open) => setDeleteConfirm({ ...deleteConfirm, open })}
          onConfirm={deleteConfirm.type === 'product' ? handleDeleteProduct : handleDeleteCategory}
          title={`Delete ${deleteConfirm.type === 'product' ? 'Product' : 'Category'}?`}
          description={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone.`}
          confirmText="Delete"
          variant="destructive"
        />
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-label, .print-label * {
            visibility: visible;
          }
          .print-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
