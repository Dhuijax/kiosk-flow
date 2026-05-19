"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getAuthenticatedClient } from "@/lib/grpc/client";
import { TableService } from "@/gen/table_connect";
import { CategoryService } from "@/gen/category_connect";
import { ProductService } from "@/gen/product_connect";
import { OrderService } from "@/gen/order_connect";
import { Table } from "@/gen/table_pb";
import { Category } from "@/gen/category_pb";
import { Product, Topping } from "@/gen/product_pb";
import { OrderItemRequest, CreateOrderRequest, Order } from "@/gen/order_pb";
import { Money } from "@/gen/common_pb";

// Local storage key for active order ID
const ACTIVE_ORDER_KEY = "kioskflow_active_order_id";
const CUSTOMER_NAME_KEY = "kioskflow_customer_name";

export default function GuestTableOrderingPage() {
  const params = useParams();
  const tableId = params.table_id as string;

  // Tenant ID resolution from host/subdomain
  const [tenantId, setTenantId] = useState<string>("00000000-0000-0000-0000-000000000001"); // fallback

  // State variables
  const [loading, setLoading] = useState(true);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [tableData, setTableData] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Cart State
  const [cart, setCart] = useState<{
    product: Product;
    quantity: number;
    selectedToppings: Topping[];
    note: string;
    uniqueKey: string; // combination of productId and selected topping IDs
  }[]>([]);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // Topping Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalToppings, setModalToppings] = useState<Topping[]>([]);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNote, setModalNote] = useState("");

  // Order Tracking State
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  // Error/Success alerts
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active category list filter ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Initialize Subdomain / Tenant ID resolution
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isValidUuid = (val: string) => {
        return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
      };

      const hostname = window.location.host;
      const parts = hostname.split(".");
      let resolvedTenantId = "";

      if (parts.length > 1 && !hostname.startsWith("localhost") && !hostname.startsWith("127.0.0.1")) {
        const potentialSubdomain = parts[0];
        if (isValidUuid(potentialSubdomain)) {
          resolvedTenantId = potentialSubdomain;
        }
      }

      if (!resolvedTenantId) {
        const savedTenant = localStorage.getItem("tenant_id");
        if (savedTenant && isValidUuid(savedTenant)) {
          resolvedTenantId = savedTenant;
        } else {
          // Default tenant ID fallback for guest table view on localhost / non-subdomain deploy
          resolvedTenantId = "00000000-0000-0000-0000-000000000001";
        }
      }

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTenantId(resolvedTenantId);

      // Check for saved tracked order
      const savedOrderId = localStorage.getItem(ACTIVE_ORDER_KEY);
      if (savedOrderId) {
        setTrackedOrderId(savedOrderId);
      }

      // Check for saved customer name
      const savedName = localStorage.getItem(CUSTOMER_NAME_KEY);
      if (savedName) {
        setCustomerName(savedName);
      }
    }
  }, []);

  // Fetch Table, Categories, Products
  useEffect(() => {
    if (!tableId || trackedOrderId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // Connect Clients
        const tableClient = getAuthenticatedClient(TableService, tenantId);
        const categoryClient = getAuthenticatedClient(CategoryService, tenantId);
        const productClient = getAuthenticatedClient(ProductService, tenantId);

        // Fetch Table details
        const tableResp = await tableClient.getTable({ id: tableId });
        setTableData(tableResp);

        // Fetch Categories
        const catResp = await categoryClient.listCategories({ page: 1, pageSize: 100 });
        setCategories(catResp.categories);

        // Fetch active Products
        const prodResp = await productClient.listProducts({
          pagination: { page: 1, pageSize: 200 }
        });
        // Filter only active products
        const activeProducts = prodResp.products.filter(p => p.isActive);
        setProducts(activeProducts);

      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error("Error loading table menu:", err);
        setErrorMsg("Không thể tải thông tin thực đơn. Vui lòng kiểm tra lại mã QR hoặc kết nối mạng.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tableId, tenantId, trackedOrderId]);

  // Order status polling effect
  useEffect(() => {
    if (!trackedOrderId) return;

    const fetchTrackedOrder = async () => {
      try {
        const orderClient = getAuthenticatedClient(OrderService, tenantId);
        const resp = await orderClient.getOrder({ id: trackedOrderId });
        setTrackedOrder(resp.order || null);
      } catch (err) {
        console.error("Error polling order status:", err);
      }
    };

    // Initial fetch
    fetchTrackedOrder();

    // Interval fetch every 8 seconds
    const interval = setInterval(fetchTrackedOrder, 8000);
    return () => clearInterval(interval);
  }, [trackedOrderId, tenantId]);

  // Currency Formatter Helper
  const formatCurrency = (money?: Money) => {
    if (!money) return "0 ₫";
    const amount = Number(money.units || BigInt(0));
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const getProductPriceNumber = (product: Product) => {
    return Number(product.price?.units || BigInt(0));
  };

  const getToppingPriceNumber = (topping: Topping) => {
    return Number(topping.price?.units || BigInt(0));
  };

  // Cart total calculations
  const cartItemTotal = (item: typeof cart[0]) => {
    const base = getProductPriceNumber(item.product);
    const toppingsSum = item.selectedToppings.reduce((sum, t) => sum + getToppingPriceNumber(t), 0);
    return (base + toppingsSum) * item.quantity;
  };

  const cartTotal = () => {
    return cart.reduce((sum, item) => sum + cartItemTotal(item), 0);
  };

  const cartCount = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Category change filter
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Topping Modal handlers
  const openToppingModal = (product: Product) => {
    setSelectedProduct(product);
    setModalToppings([]);
    setModalQuantity(1);
    setModalNote("");
  };

  const toggleModalTopping = (topping: Topping) => {
    if (modalToppings.some(t => t.id === topping.id)) {
      setModalToppings(modalToppings.filter(t => t.id !== topping.id));
    } else {
      setModalToppings([...modalToppings, topping]);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    // Create unique key based on selected toppings
    const sortedToppingIds = modalToppings.map(t => t.id).sort().join("-");
    const uniqueKey = `${selectedProduct.id}_${sortedToppingIds}_${modalNote}`;

    const existingIndex = cart.findIndex(item => item.uniqueKey === uniqueKey);

    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += modalQuantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        product: selectedProduct,
        quantity: modalQuantity,
        selectedToppings: modalToppings,
        note: modalNote,
        uniqueKey
      }]);
    }

    // Reset and close
    setSelectedProduct(null);
    setSuccessMsg(`Đã thêm ${selectedProduct.name} vào giỏ hàng`);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const updateCartItemQuantity = (uniqueKey: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.uniqueKey === uniqueKey) {
        const nextQty = item.quantity + delta;
        return nextQty > 0 ? { ...item, quantity: nextQty } : null;
      }
      return item;
    }).filter(Boolean) as typeof cart;
    setCart(updated);
  };

  // Order submission
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    if (!customerName.trim()) {
      setErrorMsg("Vui lòng nhập tên của bạn để nhân viên dễ dàng phục vụ.");
      return;
    }

    try {
      setSubmittingOrder(true);
      setErrorMsg(null);

      const orderClient = getAuthenticatedClient(OrderService, tenantId);

      // Save customer name for next visits
      localStorage.setItem(CUSTOMER_NAME_KEY, customerName.trim());

      // Prepare order items
      const itemsRequest = cart.map(item => {
        return new OrderItemRequest({
          productId: item.product.id,
          quantity: item.quantity,
          note: item.note,
          toppingIds: item.selectedToppings.map(t => t.id)
        });
      });

      const branchId = tableData?.branchId || "default-branch";

      const orderRequest = new CreateOrderRequest({
        branchId,
        tableId,
        customerName: customerName.trim(),
        note: orderNote.trim(),
        items: itemsRequest
      });

      const response = await orderClient.createOrder(orderRequest);

      if (response.order) {
        const newOrderId = response.order.id;
        setTrackedOrderId(newOrderId);
        setTrackedOrder(response.order);
        localStorage.setItem(ACTIVE_ORDER_KEY, newOrderId);
        setCart([]); // Clear cart
        setIsCartOpen(false);
      } else {
        throw new Error("Không nhận được thông tin đơn hàng từ máy chủ.");
      }

    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Error creating guest order:", err);
      setErrorMsg("Không thể gửi đơn hàng. Vui lòng thử lại hoặc liên hệ nhân viên phục vụ tại bàn.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Helper to get status details
  const getOrderStatusInfo = (status: number) => {
    // DomainOrderStatus mapping (DRAFT=0, CONFIRMED=1, PREPARING=2, SERVED=3, PAID=4, COMPLETED=5, CANCELLED=6)
    switch (status) {
      case 0:
        return {
          step: 1,
          title: "Chờ thu ngân duyệt",
          desc: "Đơn hàng đã được gửi đến quầy thu ngân. Nhân viên đang kiểm tra và duyệt đơn của bạn.",
          color: "text-amber-700 bg-amber-500/10 border-amber-500/20",
          progressGlow: "shadow-amber-500/10"
        };
      case 1:
      case 2:
        return {
          step: 2,
          title: "Đang pha chế",
          desc: "Đơn hàng đã được duyệt! Các Bartender của chúng tôi đang tích cực chuẩn bị món uống cho bạn.",
          color: "text-blue-700 bg-blue-500/10 border-blue-500/20",
          progressGlow: "shadow-blue-500/10"
        };
      case 3:
      case 4:
      case 5:
        return {
          step: 3,
          title: "Đã phục vụ",
          desc: "Món ngon đã sẵn sàng trên bàn! Chúc bạn có những phút giây thưởng thức thật tuyệt vời.",
          color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
          progressGlow: "shadow-emerald-500/10"
        };
      case 6:
        return {
          step: 0,
          title: "Đã hủy",
          desc: "Đơn hàng của bạn đã bị hủy hoặc từ chối. Vui lòng liên hệ nhân viên để được hỗ trợ.",
          color: "text-rose-700 bg-rose-500/10 border-rose-500/20",
          progressGlow: "shadow-rose-500/10"
        };
      default:
        return {
          step: 1,
          title: "Đang xử lý",
          desc: "Hệ thống đang đồng bộ dữ liệu đơn hàng của bạn.",
          color: "text-foreground/75 bg-foreground/5 border-foreground/10",
          progressGlow: ""
        };
    }
  };

  const handleClearTracking = () => {
    localStorage.removeItem(ACTIVE_ORDER_KEY);
    setTrackedOrderId(null);
    setTrackedOrder(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-6">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-foreground/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-foreground/60 font-medium animate-pulse">Đang kết nối bàn & tải thực đơn...</p>
      </div>
    );
  }

  // ----------------------------------------------------
  // ORDER TRACKING SCREEN (If order is already placed)
  // ----------------------------------------------------
  if (trackedOrderId && trackedOrder) {
    const statusInfo = getOrderStatusInfo(trackedOrder.status);

    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-12 relative overflow-hidden">
        {/* Glowing Background Art */}
        <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[80vw] h-[80vw] rounded-full bg-interaction/5 blur-[120px] pointer-events-none"></div>

        {/* Top Header */}
        <header className="sticky top-0 z-30 backdrop-blur-md bg-background/85 border-b border-foreground/10 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="font-semibold text-primary tracking-wide">KioskFlow LIVE</span>
          </div>
          <span className="text-sm font-semibold px-3 py-1 rounded-full bg-surface border border-foreground/10 text-foreground">
            {tableData?.name || "Bàn gọi món"}
          </span>
        </header>

        {/* Live Tracking Core */}
        <main className="flex-1 max-w-md w-full mx-auto px-5 pt-8 flex flex-col items-center">
          
          {/* Success Ring Indicator */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-md scale-110 animate-pulse"></div>
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center p-1.5 animate-[spin_30s_linear_infinite]">
              <div className="w-full h-full rounded-full border border-primary/20 flex items-center justify-center bg-surface">
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-foreground mb-1">Cảm ơn bạn đã đặt món!</h2>
          <p className="text-foreground/60 text-sm text-center mb-6">Đơn hàng của bạn đang được truyền phát trực tiếp.</p>

          {/* Active Status Display Card */}
          <div className={`w-full border rounded-2xl p-5 mb-8 flex flex-col gap-3 transition-all duration-300 ${statusInfo.color}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-extrabold tracking-wider opacity-85">Trạng thái hiện tại</span>
              <span className="text-xs font-mono bg-black/5 px-2 py-0.5 rounded">#{trackedOrder.orderNumber}</span>
            </div>
            <h3 className="text-xl font-bold text-foreground">{statusInfo.title}</h3>
            <p className="text-sm opacity-90 leading-relaxed text-foreground/80">{statusInfo.desc}</p>
          </div>

          {/* Live Progress Tracker Stepper */}
          <div className="w-full bg-surface border border-foreground/10 rounded-2xl p-6 mb-8 shadow-sm">
            <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-6">Tiến trình chuẩn bị</h4>
            
            <div className="flex justify-between items-center relative px-2">
              {/* Stepper connector line */}
              <div className="absolute top-5 left-10 right-10 h-0.5 bg-foreground/5 z-0">
                <div 
                  className="h-full bg-primary transition-all duration-500" 
                  style={{ width: statusInfo.step === 1 ? "0%" : statusInfo.step === 2 ? "50%" : statusInfo.step === 3 ? "100%" : "0%" }}
                ></div>
              </div>

              {/* Step 1: Sent / Draft */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  statusInfo.step >= 1 
                    ? "bg-primary border-primary text-white shadow-md shadow-primary/15" 
                    : "bg-background border-foreground/10 text-foreground/40"
                }`}>
                  <span className="text-sm font-bold">1</span>
                </div>
                <span className={`text-xs font-semibold mt-2.5 ${statusInfo.step >= 1 ? "text-primary font-bold" : "text-foreground/40"}`}>Gửi đơn</span>
              </div>

              {/* Step 2: Preparing */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  statusInfo.step >= 2 
                    ? "bg-primary border-primary text-white shadow-md shadow-primary/15" 
                    : "bg-background border-foreground/10 text-foreground/40"
                }`}>
                  <span className="text-sm font-bold">2</span>
                </div>
                <span className={`text-xs font-semibold mt-2.5 ${statusInfo.step >= 2 ? "text-primary font-bold" : "text-foreground/40"}`}>Pha chế</span>
              </div>

              {/* Step 3: Completed */}
              <div className="flex flex-col items-center z-10">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  statusInfo.step >= 3 
                    ? "bg-primary border-primary text-white shadow-md shadow-primary/15" 
                    : "bg-background border-foreground/10 text-foreground/40"
                }`}>
                  <span className="text-sm font-bold">3</span>
                </div>
                <span className={`text-xs font-semibold mt-2.5 ${statusInfo.step >= 3 ? "text-primary font-bold" : "text-foreground/40"}`}>Phục vụ</span>
              </div>
            </div>
          </div>

          {/* Ordered items details breakdown */}
          <div className="w-full bg-surface border border-foreground/10 rounded-2xl p-5 mb-8 shadow-sm">
            <h4 className="text-sm font-bold text-foreground mb-3 border-b border-foreground/5 pb-2">Chi tiết đơn hàng</h4>
            <div className="flex flex-col gap-3">
              {trackedOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-sm">
                  <div className="flex-1 pr-3">
                    <p className="font-semibold text-foreground">
                      {item.productName} <span className="text-primary text-xs font-mono font-bold">x{item.quantity}</span>
                    </p>
                    {item.toppings && item.toppings.length > 0 && (
                      <p className="text-xs text-foreground/60 mt-0.5">
                        +{item.toppings.map(t => t.name).join(", ")}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-xs text-amber-700 italic mt-0.5">Ghi chú: {item.note}</p>
                    )}
                  </div>
                  <span className="font-mono text-foreground/80 font-bold">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t border-foreground/5 mt-4 pt-3 flex justify-between items-center">
              <span className="font-semibold text-foreground/75 text-sm">Tổng cộng</span>
              <span className="font-mono text-primary font-black text-base">{formatCurrency(trackedOrder.total)}</span>
            </div>
          </div>

          {/* Action to order more */}
          <button
            onClick={handleClearTracking}
            className="w-full py-3.5 px-6 rounded-xl bg-surface hover:bg-foreground/5 border border-foreground/10 text-foreground font-bold transition-all duration-300 flex items-center justify-center gap-2 hover:shadow shadow-sm"
          >
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Gọi thêm món uống khác
          </button>

        </main>
      </div>
    );
  }

  // ----------------------------------------------------
  // MENU CATALOGUE & ORDER PLACEMENT SCREEN
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans pb-28 relative overflow-hidden">
      {/* Sleek Backdrop Blurs */}
      <div className="absolute top-0 left-[-10vw] w-[50vw] h-[50vw] rounded-full bg-primary/5 blur-[100px] pointer-events-none"></div>
      <div className="absolute top-[40vh] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-interaction/5 blur-[100px] pointer-events-none"></div>

      {/* Static Welcome banner & Table indicator */}
      <header className="sticky top-0 z-30 backdrop-blur-lg bg-background/80 border-b border-foreground/10 px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-foreground/50 font-extrabold">Chào mừng bạn đến với</span>
          <h1 className="text-base font-extrabold text-primary">
            KioskFlow Cafe
          </h1>
        </div>
        
        {/* Glow badge for table number */}
        <div className="relative">
          <div className="absolute inset-0 bg-primary/10 blur-md rounded-full scale-105"></div>
          <span className="relative z-10 px-3.5 py-1.5 rounded-full bg-surface border border-foreground/10 text-primary text-xs font-bold shadow-sm">
            {tableData?.name || "Bàn Kiosk"}
          </span>
        </div>
      </header>

      {/* Core catalog controls */}
      <div className="px-4 pt-5 pb-2">
        {/* Search bar */}
        <div className="relative mb-5">
          <input
            type="text"
            placeholder="Tìm món uống bạn yêu thích..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-foreground/15 focus:border-primary/50 rounded-xl py-3 pl-11 pr-4 text-sm text-foreground placeholder-foreground/45 outline-none transition-all duration-300 shadow-sm"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Horizontal Category List selector */}
        <div className="flex items-center gap-2 mb-4 overflow-hidden relative">
          <div 
            ref={categoryScrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {/* 'ALL' category */}
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 flex-shrink-0 snap-align-start border ${
                selectedCategory === "all"
                  ? "bg-primary text-white border-primary shadow-sm shadow-primary/10"
                  : "bg-surface border-foreground/10 text-foreground/60 hover:text-foreground"
              }`}
            >
              Tất cả
            </button>

            {/* Custom categories */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 flex-shrink-0 snap-align-start border ${
                  selectedCategory === category.id
                    ? "bg-primary text-white border-primary shadow-sm shadow-primary/10"
                    : "bg-surface border-foreground/10 text-foreground/60 hover:text-foreground"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Success Notifications */}
      {successMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-interaction text-white text-xs font-semibold shadow-xl border border-interaction/30 flex items-center gap-2 animate-bounce">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
          {successMsg}
        </div>
      )}

      {/* Floating Error Alert */}
      {errorMsg && (
        <div className="mx-4 mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs leading-relaxed flex items-start gap-3">
          <svg className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Catalog items Grid */}
      <main className="flex-1 px-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-foreground/40">
            <svg className="w-12 h-12 text-foreground/30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">Không tìm thấy sản phẩm nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {filteredProducts.map((product) => {
              const hasToppings = product.allowTopping && product.toppings && product.toppings.length > 0;
              return (
                <div
                  key={product.id}
                  className="bg-surface border border-foreground/10 rounded-2xl p-3 flex flex-col justify-between hover:border-primary/30 hover:shadow-md transition-all duration-300 group shadow-sm"
                >
                  <div>
                    {/* Visual container with placeholder fallback design */}
                    <div className="relative aspect-square w-full rounded-xl bg-foreground/5 overflow-hidden mb-3 border border-foreground/5 flex items-center justify-center">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4">
                          {/* Rich fallback icons depending on name queries */}
                          {product.name.toLowerCase().includes("trà") || product.name.toLowerCase().includes("tea") ? (
                            <svg className="w-10 h-10 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          ) : (
                            <svg className="w-10 h-10 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-11.314l.707.707m11.314 11.314l.707-.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
                            </svg>
                          )}
                          <span className="text-[9px] uppercase tracking-wider text-foreground/40 font-extrabold mt-2">KioskFlow</span>
                        </div>
                      )}
                      
                      {/* Optional Toppings Indicator tag */}
                      {hasToppings && (
                        <span className="absolute top-2 left-2 bg-interaction text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-md uppercase tracking-wider">
                          Topping
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-foreground text-sm line-clamp-1 mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-foreground/60 text-xs line-clamp-2 leading-relaxed mb-2 font-normal">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-foreground/5">
                    <span className="font-mono text-primary font-bold text-sm">
                      {formatCurrency(product.price)}
                    </span>
                    <button
                      onClick={() => openToppingModal(product)}
                      className="h-8 w-8 rounded-full bg-primary hover:bg-primary/95 active:scale-95 flex items-center justify-center text-white shadow-sm shadow-primary/10 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ----------------------------------------------------
          TOPPING & NOTE SELECTION MODAL
      ---------------------------------------------------- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/65 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md bg-surface border-t border-foreground/10 rounded-t-3xl overflow-hidden shadow-2xl p-5 flex flex-col gap-4 animate-[slideUp_0.3s_ease-out]">
            
            {/* Modal Drag handle visual indicator */}
            <div className="w-12 h-1.5 rounded-full bg-foreground/10 mx-auto mb-1"></div>

            {/* Product details summary */}
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3">
                <span className="text-[10px] font-extrabold uppercase text-primary tracking-wider">Tùy biến món uống</span>
                <h3 className="text-lg font-bold text-foreground mt-0.5">{selectedProduct.name}</h3>
                <p className="text-xs text-primary/80 font-mono mt-1 font-semibold">
                  Đơn giá: {formatCurrency(selectedProduct.price)}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Toppings Selection Core */}
            {selectedProduct.allowTopping && selectedProduct.toppings && selectedProduct.toppings.length > 0 && (
              <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
                <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-widest mb-1.5">Chọn thêm Topping</h4>
                {selectedProduct.toppings.filter(t => t.isActive).map(topping => {
                  const isChecked = modalToppings.some(t => t.id === topping.id);
                  return (
                    <button
                      key={topping.id}
                      onClick={() => toggleModalTopping(topping)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-sm transition-all duration-200 ${
                        isChecked
                          ? "bg-primary/10 border-primary text-primary"
                          : "bg-surface border-foreground/10 text-foreground/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? "bg-primary border-primary" : "border-foreground/20 bg-background"
                        }`}>
                          {isChecked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-foreground">{topping.name}</span>
                      </div>
                      <span className="font-mono text-primary font-semibold">+{formatCurrency(topping.price)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Note text field */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Ghi chú đặc biệt</h4>
              <textarea
                placeholder="Ví dụ: Ít đường, ít đá, thêm cốc giấy..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                rows={2}
                className="w-full bg-background border border-foreground/10 focus:border-primary/45 rounded-xl p-3 text-xs text-foreground placeholder-foreground/35 outline-none resize-none transition-all"
              />
            </div>

            {/* Quantity control & add submit */}
            <div className="flex items-center justify-between border-t border-foreground/10 pt-4 mt-1">
              <div className="flex items-center gap-3 bg-background border border-foreground/10 rounded-xl p-1.5">
                <button
                  disabled={modalQuantity <= 1}
                  onClick={() => setModalQuantity(modalQuantity - 1)}
                  className="h-7 w-7 rounded-lg bg-surface text-foreground/75 border border-foreground/10 hover:text-foreground flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all"
                >
                  -
                </button>
                <span className="font-mono font-bold text-sm text-foreground w-6 text-center">{modalQuantity}</span>
                <button
                  onClick={() => setModalQuantity(modalQuantity + 1)}
                  className="h-7 w-7 rounded-lg bg-surface text-foreground/75 border border-foreground/10 hover:text-foreground flex items-center justify-center transition-all"
                >
                  +
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="flex-1 ml-4 py-3.5 px-6 rounded-xl bg-primary hover:bg-primary/95 font-bold text-sm text-white shadow-md shadow-primary/10 flex items-center justify-center gap-2 active:scale-98 transition-all"
              >
                <span>Thêm vào giỏ</span>
                <span>•</span>
                <span className="font-mono">
                  {formatCurrency(new Money({
                    units: BigInt(
                      (getProductPriceNumber(selectedProduct) + 
                       modalToppings.reduce((sum, t) => sum + getToppingPriceNumber(t), 0)) * modalQuantity
                    )
                  }))}
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------
          CART BOTTOM ACTION OVERLAY DRAWER
      ---------------------------------------------------- */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-5 pt-3 bg-gradient-to-t from-background via-background/95 to-transparent">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-md mx-auto py-4 px-5 rounded-2xl bg-gradient-to-r from-primary to-interaction hover:scale-102 flex items-center justify-between text-white shadow-xl shadow-primary/20 active:scale-98 transition-all duration-300 animate-pulse"
          >
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-lg bg-white/25 text-xs font-bold flex items-center justify-center">
                {cartCount()}
              </span>
              <span className="text-sm font-extrabold tracking-wide">Xem giỏ hàng của bạn</span>
            </div>
            <span className="font-mono font-bold tracking-wide">{formatCurrency(new Money({ units: BigInt(cartTotal()) }))}</span>
          </button>
        </div>
      )}

      {/* Full height Slideup Drawer for shopping cart details */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-end justify-center p-0 transition-all duration-300">
          <div className="w-full max-w-md bg-surface border-t border-foreground/10 rounded-t-3xl overflow-hidden shadow-2xl p-5 flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
            
            {/* Modal indicator */}
            <div className="w-12 h-1.5 rounded-full bg-foreground/10 mx-auto mb-2 flex-shrink-0"></div>

            {/* Header section */}
            <div className="flex justify-between items-center border-b border-foreground/10 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-foreground">Giỏ hàng của bạn</span>
                <span className="text-xs bg-primary/10 text-primary font-mono px-2 py-0.5 rounded font-extrabold">
                  {cartCount()} món
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center text-foreground/60 hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable list of products */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 pr-1">
              {cart.map((item) => (
                <div
                  key={item.uniqueKey}
                  className="bg-background border border-foreground/10 rounded-2xl p-4.5 flex justify-between items-start gap-3.5"
                >
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground text-sm leading-snug">{item.product.name}</h4>
                    {item.selectedToppings.length > 0 && (
                      <p className="text-xs text-primary mt-1 leading-normal">
                        +{item.selectedToppings.map(t => t.name).join(", ")}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-xs text-amber-700 italic mt-1 leading-normal">
                        Ghi chú: {item.note}
                      </p>
                    )}
                    <p className="font-mono text-primary text-xs font-bold mt-2.5">
                      {formatCurrency(new Money({ units: BigInt(cartItemTotal(item)) }))}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-surface border border-foreground/10 rounded-lg p-1 flex-shrink-0">
                    <button
                      onClick={() => updateCartItemQuantity(item.uniqueKey, -1)}
                      className="h-6 w-6 rounded bg-background border border-foreground/5 text-foreground/75 font-bold text-xs flex items-center justify-center transition-all"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-xs text-foreground w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItemQuantity(item.uniqueKey, 1)}
                      className="h-6 w-6 rounded bg-background border border-foreground/5 text-foreground/75 font-bold text-xs flex items-center justify-center transition-all"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Validation & place order form footer container */}
            <div className="border-t border-foreground/10 pt-4 flex flex-col gap-4 flex-shrink-0">
              
              {/* Form Input fields */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Tên của bạn *</label>
                  <input
                    type="text"
                    required
                    placeholder="Nhập tên của bạn để nhân viên tiện gọi phục vụ..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-background border border-foreground/10 focus:border-primary/40 rounded-xl py-3 px-4 text-xs text-foreground placeholder-foreground/35 outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground/50 uppercase tracking-widest">Ghi chú cho đơn hàng (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="Ghi chú chung cho toàn bộ đơn hàng của bạn..."
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full bg-background border border-foreground/10 focus:border-primary/40 rounded-xl py-3 px-4 text-xs text-foreground placeholder-foreground/35 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Order total checkout */}
              <div className="flex justify-between items-center text-sm pt-2">
                <span className="font-semibold text-foreground/60">Tổng thanh toán</span>
                <span className="font-mono text-primary font-black text-lg">
                  {formatCurrency(new Money({ units: BigInt(cartTotal()) }))}
                </span>
              </div>

              {/* Place Order CTA Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={submittingOrder || cart.length === 0}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-interaction hover:opacity-95 disabled:opacity-40 disabled:pointer-events-none text-white font-extrabold text-sm tracking-wide shadow-md shadow-primary/10 flex items-center justify-center gap-2 transition-all duration-300"
              >
                {submittingOrder ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>Đang gửi đơn hàng của bạn...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Xác nhận & Gửi yêu cầu đặt món</span>
                  </>
                )}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Static custom modal CSS transition helpers */}
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-none {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
