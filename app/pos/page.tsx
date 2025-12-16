'use client';

import { useState, useEffect, useRef } from 'react';
import { CartProvider, useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Search, User, Trash2, ShoppingCart, Tag, Percent, Star, LayoutDashboard, Package } from 'lucide-react';
import { WeightEntryModal } from '@/components/WeightEntryModal';
import { Database } from '@/lib/supabase/types';
import { getMembershipByBarcode } from '@/lib/loyalty/service';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

type Product = Database['public']['Tables']['products']['Row'];

const convertWeightToKg = (weight: number | undefined, unit: string | undefined): string => {
  if (!weight) return '0.00';
  if (unit === 'g') {
    return (weight / 1000).toFixed(2);
  }
  if (unit === 'lb') {
    return (weight * 0.453592).toFixed(2);
  }
  return weight.toFixed(2);
};

const formatWeightUnitPrice = (price: number): string => {
  return `£${price.toFixed(2)}/kg`;
};

function POSContent() {
  const { cart, membership, setMembership, addItem, removeItem, updateItemQuantity, clearCart, subtotal, totalDiscount, grandTotal, promotionSummary } = useCart();
  const { userProfile } = useAuth();
  const { tenantId, currentBranch } = useTenant();
  const { toast } = useToast();
  const router = useRouter();

  const [searchInput, setSearchInput] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [displayProducts, setDisplayProducts] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [showChangeDialog, setShowChangeDialog] = useState(false);
  const [changeAmount, setChangeAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [showSplitPaymentDialog, setShowSplitPaymentDialog] = useState(false);
  const [cardAmount, setCardAmount] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'split'>('cash');

  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [showViewDraftsDialog, setShowViewDraftsDialog] = useState(false);
  const [draftCarts, setDraftCarts] = useState<any[]>([]);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showLoyaltyDialog, setShowLoyaltyDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showReceiptPrintDialog, setShowReceiptPrintDialog] = useState(false);
  const [receiptBarcode, setReceiptBarcode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [transactionHistory, setTransactionHistory] = useState<any[]>([]);
  const [cashInputValue, setCashInputValue] = useState('');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);

  const loadDraftCarts = async () => {
    if (!tenantId || !currentBranch) return;

    const { data, error } = await supabase
      .from('draft_carts')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('branch_id', currentBranch.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading drafts:', error);
      return;
    }

    setDraftCarts(data || []);
  };

  const saveDraftCart = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Empty Cart',
        description: 'Cannot save an empty cart as draft',
        variant: 'destructive',
      });
      return;
    }

    if (!tenantId || !currentBranch || !userProfile) return;

    const { error } = await (supabase as any)
      .from('draft_carts')
      .insert({
        tenant_id: tenantId,
        branch_id: currentBranch.id,
        user_id: userProfile.id,
        cart_data: cart,
      });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft cart',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Draft Saved',
      description: 'Cart saved as draft for 24 hours',
    });

    clearCart();
    setShowSaveDraftDialog(false);
    loadDraftCarts();
  };

  const loadDraftToCart = async (draftId: string, cartData: any[]) => {
    if (!tenantId) return;

    for (const item of cartData) {
      const { data: product } = await supabase
        .from('products')
        .select('*')
        .eq('id', item.product_id)
        .eq('tenant_id', tenantId)
        .single();

      if (product) {
        if (item.is_weight_item && item.measured_weight) {
          addItem(product, item.quantity, {
            weight: item.measured_weight,
            tare: item.tare_weight || 0,
            isScaleMeasured: item.is_scale_measured || false,
            weightUnit: item.weight_unit || (product as any).weight_unit || 'kg'
          });
        } else {
          addItem(product, item.quantity);
        }
      }
    }

    const { error } = await supabase
      .from('draft_carts')
      .delete()
      .eq('id', draftId);

    if (error) {
      console.error('Error deleting draft:', error);
    }

    toast({
      title: 'Draft Loaded',
      description: 'Draft cart loaded and removed from drafts',
    });

    setShowViewDraftsDialog(false);
    loadDraftCarts();
  };

  const deleteDraft = async (draftId: string) => {
    const { error } = await supabase
      .from('draft_carts')
      .delete()
      .eq('id', draftId);

    if (!error) {
      loadDraftCarts();
      toast({
        title: 'Draft Deleted',
        description: 'Draft cart deleted successfully',
      });
    }
  };

  useEffect(() => {
    if (!userProfile) {
      router.push('/login');
      return;
    }
    loadProducts();
  }, [tenantId, userProfile]);

  useEffect(() => {
    if (searchInput.trim().length >= 2) {
      const filtered = products.filter(p =>
        p.name.toLowerCase().includes(searchInput.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchInput.toLowerCase()) ||
        p.barcode?.toLowerCase().includes(searchInput.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [searchInput, products]);

  const loadProducts = async () => {
    if (!tenantId) return;

    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setProducts(data);
      setDisplayProducts(data);
      const featuredProducts = data.filter((p: Product) => (p as any).is_featured_category);
      const allCategories = featuredProducts.map((p: Product) => p.category).filter(Boolean) as string[];
      const uniqueCategories = ['All', ...Array.from(new Set(allCategories))];
      setCategories(uniqueCategories);
    }
  };

  useEffect(() => {
    if (selectedCategory === 'All') {
      setDisplayProducts(products);
    } else {
      setDisplayProducts(products.filter(p => p.category === selectedCategory));
    }
  }, [selectedCategory, products]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim() || !tenantId) return;

    const membershipCheck = await getMembershipByBarcode(searchInput, tenantId);

    if (membershipCheck) {
      if (membership) {
        toast({
          title: 'Membership Already Applied',
          description: `${membership.member_name} is already attached. Remove first to scan another.`,
          variant: 'destructive',
        });
      } else {
        setMembership(membershipCheck);
        toast({
          title: 'Member Applied',
          description: `Welcome, ${membershipCheck.member_name}!`,
        });
      }
      setSearchInput('');
      return;
    }

    const product = products.find(p => p.barcode === searchInput);

    if (product) {
      if ((product as any).is_weight_based) {
        setWeightProduct(product);
        setShowWeightModal(true);
        setSearchInput('');
      } else {
        addItem(product, 1);
        toast({
          title: 'Item Added',
          description: product.name,
        });
        setSearchInput('');
      }
    } else {
      toast({
        title: 'Not Found',
        description: 'No product or membership found with this input',
        variant: 'destructive',
      });
    }
  };

  const handleProductClick = (product: Product) => {
    if ((product as any).is_weight_based) {
      setWeightProduct(product);
      setShowWeightModal(true);
    } else {
      addItem(product, 1);
      setSearchInput('');
    }
  };

  const handleWeightConfirm = (weight: number) => {
    if (weightProduct) {
      const quantityForCalculation = weight / 1000;

      addItem(weightProduct, quantityForCalculation, {
        weight: weight,
        tare: 0,
        isScaleMeasured: false,
        weightUnit: 'g'
      });
      const displayWeight = convertWeightToKg(weight, 'g');
      toast({
        title: 'Item Added',
        description: `${weightProduct.name} - ${displayWeight} kg`,
      });
      setWeightProduct(null);
    }
  };

  const handleNumberClick = (value: string) => {
    if (value === '.') {
      if (!cashInputValue.includes('.')) {
        setCashInputValue(cashInputValue + value);
      }
    } else if (value === '⌫') {
      setCashInputValue(cashInputValue.slice(0, -1));
    } else {
      setCashInputValue(cashInputValue + value);
    }
  };

  const handleCashPayment = () => {
    if (cart.length === 0) return;
    setPaymentType('cash');
    setShowReceiptDialog(true);
  };

  const handleQuickPayment = (amount: number) => {
    if (cart.length === 0) return;
    const change = amount - grandTotal;
    setCashReceived(amount);
    setChangeAmount(change);
    setPaymentType('cash');
    setShowChangeDialog(true);
  };

  const handleCardPayment = () => {
    if (cart.length === 0) return;
    setPaymentType('card');
    setShowReceiptDialog(true);
  };

  const handleSplitPayment = () => {
    if (cart.length === 0) return;
    setCardAmount('');
    setCashAmount('');
    setShowSplitPaymentDialog(true);
  };

  const processSplitPayment = () => {
    const card = parseFloat(cardAmount) || 0;
    const cash = parseFloat(cashAmount) || 0;
    const total = card + cash;

    if (total < grandTotal) {
      toast({
        title: 'Insufficient Payment',
        description: `Total payment (£${total.toFixed(2)}) is less than grand total (£${grandTotal.toFixed(2)})`,
        variant: 'destructive',
      });
      return;
    }

    const change = total - grandTotal;
    setChangeAmount(change);
    setCashReceived(cash);
    setShowSplitPaymentDialog(false);

    if (change > 0) {
      setShowChangeDialog(true);
    } else {
      setShowReceiptDialog(true);
    }
  };

  const generateBarcode = () => {
    return 'RC' + Date.now().toString() + Math.random().toString(36).substring(2, 7).toUpperCase();
  };

  const saveSaleToDatabase = async (barcode: string) => {
    if (!tenantId || !currentBranch || !userProfile) return;

    try {
      const saleNumber = 'S' + Date.now().toString();

      const { data: saleData, error: saleError } = await (supabase as any)
        .from('sales')
        .insert({
          tenant_id: tenantId,
          branch_id: currentBranch.id,
          sale_number: saleNumber,
          cashier_id: userProfile.id,
          membership_id: membership?.id || null,
          subtotal: subtotal,
          total_discount: totalDiscount,
          grand_total: grandTotal,
          payment_method: paymentType,
          payment_amount: paymentType === 'cash' ? cashReceived : grandTotal,
          change_amount: changeAmount,
          status: 'completed',
          receipt_barcode: barcode,
          sale_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (saleError) throw saleError;

      for (const item of cart) {
        await (supabase as any)
          .from('sale_items')
          .insert({
            tenant_id: tenantId,
            sale_id: saleData.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_discount: item.line_discount,
            line_total: item.line_total,
          });
      }

      loadTransactionHistory();
    } catch (error) {
      console.error('Error saving sale:', error);
    }
  };

  const completeTransaction = async (printReceipt: boolean) => {
    const barcode = generateBarcode();
    setReceiptBarcode(barcode);

    await saveSaleToDatabase(barcode);

    if (printReceipt) {
      setShowReceiptPrintDialog(true);
    } else {
      toast({
        title: 'Payment Completed',
        description: 'Transaction completed without receipt',
      });
    }

    clearCart();
    setCashInputValue('');
    setShowReceiptDialog(false);
    setShowChangeDialog(false);
  };

  const loadTransactionHistory = async () => {
    if (!tenantId || !currentBranch) return;

    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('branch_id', currentBranch.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setTransactionHistory(data);
    }
  };

  const applyDiscount = () => {
    const value = parseFloat(discountValue) || 0;
    if (value <= 0) {
      toast({
        title: 'Invalid Discount',
        description: 'Please enter a valid discount value',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Discount Applied',
      description: `${discountType === 'percentage' ? value + '%' : '£' + value.toFixed(2)} discount applied`,
    });
    setShowDiscountDialog(false);
    setDiscountValue('');
  };

  const handlePayClick = () => {
    if (cart.length === 0) return;
    handleSplitPayment();
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <div style={{ width: '45%' }} className="bg-[#e8e4dc] border-r border-slate-300 flex flex-col p-3">
        <div className="flex-1 overflow-y-auto mb-3">
          <div className="bg-white rounded-md shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#d4d0c8] border-b border-slate-300">
                  <th className="text-left px-3 py-2 text-sm font-bold">Item</th>
                  <th className="text-right px-3 py-2 text-sm font-bold">Price</th>
                  <th className="text-right px-3 py-2 text-sm font-bold">Qty</th>
                  <th className="text-right px-3 py-2 text-sm font-bold">Discount</th>
                  <th className="text-right px-3 py-2 text-sm font-bold">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400 text-sm">
                      Cart is empty
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => {
                    const nameLength = item.product_name.length;
                    const fontSize = nameLength > 25 ? 'text-[11px]' : nameLength > 18 ? 'text-xs' : 'text-sm';

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer relative group"
                        onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
                      >
                        <td className="px-3 py-2">
                          <div className={`font-semibold ${fontSize} truncate pr-6`}>
                            {item.product_name}
                          </div>
                        </td>
                        <td className="text-right px-3 py-2 text-sm">
                          {item.is_weight_item && item.weight_unit
                            ? formatWeightUnitPrice(item.unit_price || 0)
                            : `£${(item.unit_price || 0).toFixed(2)}`
                          }
                        </td>
                        <td className="text-right px-3 py-2 text-sm font-semibold">
                          {item.is_weight_item && item.measured_weight
                            ? `${convertWeightToKg(item.measured_weight, item.weight_unit)} kg`
                            : item.quantity || 0
                          }
                        </td>
                        <td className="text-right px-3 py-2 text-sm text-red-600">
                          £{(item.line_discount || 0).toFixed(2)}
                        </td>
                        <td className="text-right px-3 py-2 text-base font-bold">
                          £{(item.line_total || 0).toFixed(2)}
                        </td>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(item.id);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="bg-white rounded-md shadow-sm px-3 py-2.5">
            <div className="flex justify-between items-center text-sm mb-1.5">
              <div>
                <span className="font-medium">Total Items: </span>
                <span className="font-bold">{cart.length}</span>
              </div>
              <div>
                <span className="font-medium">Subtotal:</span>
                <span className="ml-2 font-bold">£{subtotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center text-sm pt-1.5 border-t border-slate-200">
              <div>
                <span className="font-medium">Total Discount: </span>
                <span className="font-bold text-red-600">£{totalDiscount.toFixed(2)}</span>
              </div>
              <div>
                <span className="font-medium">Due:</span>
                <span className="ml-2 font-bold text-lg">£{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-2">
              <Input
                placeholder="Input"
                value={cashInputValue}
                onChange={(e) => setCashInputValue(e.target.value)}
                className="h-10 bg-white border-2 border-slate-300"
              />

              <div className="grid grid-cols-3 gap-1.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((num) => (
                  <Button
                    key={num}
                    variant="outline"
                    className="h-12 text-lg font-semibold bg-[#dcd8d0] hover:bg-[#ccc8c0] border-2 border-slate-400 shadow"
                    onClick={() => handleNumberClick(num)}
                  >
                    {num}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="h-11 bg-[#2d8659] hover:bg-[#256d49] text-white font-bold text-base border-2 border-[#1f5f3d] shadow-md"
                  onClick={handleCashPayment}
                  disabled={cart.length === 0}
                >
                  Cash
                </Button>
                <Button
                  variant="outline"
                  className="h-11 bg-[#dcd8d0] hover:bg-[#ccc8c0] border-2 border-slate-400 font-bold text-base shadow-md"
                  onClick={handleCardPayment}
                  disabled={cart.length === 0}
                >
                  Card
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[5, 10, 20, 50].map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    className="h-10 bg-[#dcd8d0] hover:bg-[#ccc8c0] border-2 border-slate-400 font-bold text-base shadow"
                    onClick={() => handleQuickPayment(amount)}
                    disabled={cart.length === 0}
                  >
                    £{amount}
                  </Button>
                ))}
              </div>

              <Button
                className="w-full h-14 bg-[#2d8659] hover:bg-[#256d49] text-white font-bold text-xl border-2 border-[#1f5f3d] shadow-md"
                onClick={handlePayClick}
                disabled={cart.length === 0}
              >
                Pay
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-10 bg-[#dcd8d0] hover:bg-[#ccc8c0] border-2 border-slate-400 font-semibold shadow"
                  onClick={() => setShowSaveDraftDialog(true)}
                >
                  Save Drafts
                </Button>
                <Button
                  variant="outline"
                  className="h-10 bg-[#dcd8d0] hover:bg-[#ccc8c0] border-2 border-slate-400 font-semibold shadow"
                  onClick={() => { loadDraftCarts(); setShowViewDraftsDialog(true); }}
                >
                  View Drafts
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="p-6 border-b border-slate-200">
          <form onSubmit={handleSearchSubmit} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search products, scan barcode, or scan membership card..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 h-14 text-base bg-white border-2 border-slate-300 rounded-lg shadow-sm"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="h-14 px-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-lg shadow-md"
            >
              Enter
            </Button>
          </form>
        </div>

        <div className="px-6 pt-4 pb-2">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={`h-10 px-6 font-semibold ${
                  selectedCategory === category
                    ? 'bg-slate-900 hover:bg-slate-800 text-white'
                    : 'bg-white hover:bg-slate-50 border-slate-300'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
            {displayProducts.slice(0, 24).map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="bg-white border-2 border-slate-300 rounded-xl overflow-hidden hover:shadow-lg transition-all hover:scale-105"
              >
                <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-6">
                  <div className="text-6xl">🥬</div>
                </div>
                <div className="p-3 space-y-1">
                  <div className="font-bold text-sm truncate">{product.name}</div>
                  <div className="text-slate-900 font-bold text-base">
                    £{product.price_per_unit.toFixed(2)}
                    {(product as any).is_weight_based && `/${(product as any).weight_unit || 'kg'}`}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-[#f8f9fa] p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              variant="outline"
              className="h-10 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-2"
              onClick={() => setShowCustomerDialog(true)}
            >
              <User className="h-4 w-4" />
              Customer
            </Button>
            <Button
              variant="outline"
              className="h-10 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-2"
              onClick={() => setShowPromoDialog(true)}
            >
              <Tag className="h-4 w-4" />
              Promo
            </Button>
            <Button
              variant="outline"
              className="h-10 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-2"
              onClick={() => setShowDiscountDialog(true)}
            >
              <Percent className="h-4 w-4" />
              Discount
            </Button>
            <Button
              variant="outline"
              className="h-10 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-2"
              onClick={() => { loadTransactionHistory(); setShowHistoryDialog(true); }}
            >
              <ShoppingCart className="h-4 w-4" />
              History
            </Button>
            <Button
              variant="outline"
              className="h-10 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-2"
              onClick={() => setShowLoyaltyDialog(true)}
            >
              <Star className="h-4 w-4" />
              Loyalty
            </Button>
            <Button
              variant="outline"
              className="h-10 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-2"
              onClick={() => router.push('/dashboard')}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Button>
            <Button
              variant="outline"
              className="h-10 bg-white hover:bg-slate-50 border-slate-300 flex items-center gap-2"
              onClick={() => router.push('/dashboard/products')}
            >
              <Package className="h-4 w-4" />
              Products
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showChangeDialog} onOpenChange={setShowChangeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Due</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2">
              <div className="text-sm text-slate-600">Cash Received</div>
              <div className="text-2xl font-bold">£{cashReceived.toFixed(2)}</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-sm text-slate-600">Total</div>
              <div className="text-xl">£{grandTotal.toFixed(2)}</div>
            </div>
            <div className="text-center space-y-2 border-t pt-4">
              <div className="text-sm text-slate-600">Change</div>
              <div className="text-3xl font-bold text-green-600">£{changeAmount.toFixed(2)}</div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => { setShowChangeDialog(false); setShowReceiptDialog(true); }} className="w-full">
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Print Receipt?</DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center">
            <p className="text-slate-600">Would you like to print a receipt for this transaction?</p>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={() => completeTransaction(true)} className="w-full">
              Yes, Print Receipt
            </Button>
            <Button onClick={() => completeTransaction(false)} variant="outline" className="w-full">
              No Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSplitPaymentDialog} onOpenChange={setShowSplitPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Split Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center pb-2 border-b">
              <div className="text-sm text-slate-600">Total Amount</div>
              <div className="text-2xl font-bold">£{grandTotal.toFixed(2)}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Card Amount (£)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={cardAmount}
                    onChange={(e) => setCardAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cash Amount (£)</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    className="text-base"
                  />
                </div>
                <div className="bg-slate-100 p-3 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Total:</span>
                    <span className="font-semibold">
                      £{((parseFloat(cardAmount) || 0) + (parseFloat(cashAmount) || 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span>Remaining:</span>
                    <span className={`font-semibold ${((parseFloat(cardAmount) || 0) + (parseFloat(cashAmount) || 0)) >= grandTotal ? 'text-green-600' : 'text-red-600'}`}>
                      £{Math.max(0, grandTotal - ((parseFloat(cardAmount) || 0) + (parseFloat(cashAmount) || 0))).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs text-slate-600 mb-1">Quick Entry</div>
                <div className="grid grid-cols-3 gap-1">
                  {[7, 8, 9, 4, 5, 6, 1, 2, 3, '.', 0, 'C'].map((key) => (
                    <Button
                      key={key}
                      variant="outline"
                      className="h-10 text-sm"
                      onClick={() => {
                        if (key === 'C') {
                          setCardAmount('');
                          setCashAmount('');
                        } else {
                          const val = cashAmount + key.toString();
                          setCashAmount(val);
                        }
                      }}
                    >
                      {key}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={processSplitPayment} className="w-full">
              Process Payment
            </Button>
            <Button onClick={() => setShowSplitPaymentDialog(false)} variant="outline" className="w-full">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReceiptPrintDialog} onOpenChange={setShowReceiptPrintDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-center space-y-2 pb-4 border-b">
              <h3 className="font-bold">{currentBranch?.name || 'Store'}</h3>
              <p className="text-xs text-slate-600">Point of Sale Receipt</p>
              <p className="text-xs text-slate-600">{new Date().toLocaleString()}</p>
            </div>

            <div className="space-y-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div>{item.product_name}</div>
                    {item.is_weight_item && item.measured_weight ? (
                      <div className="text-xs text-slate-500">
                        {convertWeightToKg(item.measured_weight, item.weight_unit)} kg × {formatWeightUnitPrice(item.unit_price)}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        {item.quantity} x £{item.unit_price.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div className="font-medium">£{item.line_total.toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>£{subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount:</span>
                  <span>-£{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total:</span>
                <span>£{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex flex-col items-center pt-4 border-t space-y-2">
              <div className="text-xs text-slate-600">Receipt #</div>
              <div className="bg-white border-2 border-slate-800 p-3 rounded">
                <div className="font-mono text-lg font-bold tracking-wider">{receiptBarcode}</div>
              </div>
              <div className="h-16 flex items-center">
                <svg viewBox="0 0 200 60" className="w-48 h-16">
                  {receiptBarcode.split('').map((char, i) => {
                    const code = char.charCodeAt(0);
                    const width = (code % 3) + 2;
                    return (
                      <rect
                        key={i}
                        x={i * 10}
                        y="0"
                        width={width}
                        height="60"
                        fill="black"
                      />
                    );
                  })}
                </svg>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 pt-2">
              Thank you for your purchase!
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowReceiptPrintDialog(false); clearCart(); }} className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Customer Lookup</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Phone Number or Email</label>
              <Input placeholder="Enter customer details..." />
            </div>
            <p className="text-sm text-slate-600">Search for existing customer or create new</p>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full">Search</Button>
            <Button variant="outline" className="w-full">Create New Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Promo Code</label>
              <Input placeholder="Enter promo code..." />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full">Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={discountType === 'percentage' ? 'default' : 'outline'}
                onClick={() => setDiscountType('percentage')}
                className="flex-1"
              >
                Percentage
              </Button>
              <Button
                variant={discountType === 'fixed' ? 'default' : 'outline'}
                onClick={() => setDiscountType('fixed')}
                className="flex-1"
              >
                Fixed Amount
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {discountType === 'percentage' ? 'Discount Percentage (%)' : 'Discount Amount (£)'}
              </label>
              <Input
                type="number"
                placeholder={discountType === 'percentage' ? '10' : '5.00'}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={applyDiscount} className="w-full">Apply Discount</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSaveDraftDialog} onOpenChange={setShowSaveDraftDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Draft</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600">
              Save the current cart as a draft. It will be automatically deleted after 24 hours.
            </p>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Items in cart:</span>
                <span className="font-semibold">{cart.length}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span>Total:</span>
                <span className="font-semibold">£{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full" onClick={saveDraftCart}>Save as Draft</Button>
            <Button variant="outline" className="w-full" onClick={() => setShowSaveDraftDialog(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showViewDraftsDialog} onOpenChange={setShowViewDraftsDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Draft Carts</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {draftCarts.length === 0 ? (
                <p className="text-sm text-slate-600 text-center py-8">No draft carts available</p>
              ) : (
                draftCarts.map((draft) => (
                  <div key={draft.id} className="border rounded-lg p-3 hover:bg-slate-50">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium">
                          {draft.cart_data.length} item{draft.cart_data.length !== 1 ? 's' : ''}
                        </div>
                        <div className="text-xs text-slate-600">
                          Created: {new Date(draft.created_at).toLocaleString('en-GB')}
                        </div>
                        <div className="text-xs text-slate-600">
                          Expires: {new Date(draft.expires_at).toLocaleString('en-GB')}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="font-bold">
                          £{draft.cart_data.reduce((sum: number, item: any) => sum + (item.line_total || 0), 0).toFixed(2)}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => loadDraftToCart(draft.id, draft.cart_data)}
                          >
                            Load
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs hover:bg-red-50 hover:text-red-600"
                            onClick={() => deleteDraft(draft.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setShowViewDraftsDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showLoyaltyDialog} onOpenChange={setShowLoyaltyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Loyalty Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loyalty Card Number</label>
              <Input placeholder="Scan or enter loyalty card..." />
            </div>
            <p className="text-sm text-slate-600">Scan customer loyalty card to apply points and rewards</p>
          </div>
          <DialogFooter>
            <Button className="w-full">Apply Loyalty Card</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={(open) => { setShowHistoryDialog(open); if (open) loadTransactionHistory(); }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Scan or enter receipt barcode..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="pl-9 text-sm h-9"
              />
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactionHistory
                .filter(sale => !historySearchQuery || sale.receipt_barcode?.toLowerCase().includes(historySearchQuery.toLowerCase()))
                .map((sale) => (
                <div key={sale.id} className="border rounded-lg p-3 hover:bg-slate-50 cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">Receipt #{sale.receipt_barcode}</div>
                      <div className="text-xs text-slate-600">
                        {new Date(sale.created_at).toLocaleString('en-GB')}
                      </div>
                      <div className="text-xs text-slate-500">
                        {sale.payment_method || 'N/A'} • {sale.status}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">£{parseFloat(sale.grand_total).toFixed(2)}</div>
                      <Button size="sm" variant="outline" className="mt-1 h-7 text-xs">
                        Reprint
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {transactionHistory.length === 0 && (
                <p className="text-sm text-slate-600 text-center py-8">No transactions found</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="w-full" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <WeightEntryModal
        open={showWeightModal}
        onOpenChange={setShowWeightModal}
        onConfirm={handleWeightConfirm}
        product={weightProduct ? {
          name: weightProduct.name,
          price_per_unit: weightProduct.price_per_unit,
          weight_unit: (weightProduct as any).weight_unit || 'kg',
          min_quantity_step: (weightProduct as any).min_quantity_step || 0.1,
        } : null}
      />
    </div>
  );
}

export default function POSPage() {
  return (
    <CartProvider>
      <POSContent />
    </CartProvider>
  );
}
