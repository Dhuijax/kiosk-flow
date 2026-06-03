"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getAuthenticatedClient } from "@/lib/grpc/client";
import { TableService } from "@/gen/table_connect";
import { CategoryService } from "@/gen/category_connect";
import { ProductService } from "@/gen/product_connect";
import { Table } from "@/gen/table_pb";
import { Category } from "@/gen/category_pb";
import { Product, Topping } from "@/gen/product_pb";
import { Money } from "@/gen/common_pb";
import { useTableCart } from "@/hooks/useTableCart";
import { 
  Users, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Check, 
  Sparkles, 
  AlertCircle, 
  ChevronRight, 
  Utensils, 
  Search, 
  Coffee, 
  Wifi, 
  Send 
} from "lucide-react";

export default function GuestTableOrderingPage() {
  const params = useParams();
  const tableId = params.table_id as string;

  // Configuration IDs
  const [tenantId, setTenantId] = useState<string>("00000000-0000-0000-0000-000000000001");
  const [branchId, setBranchId] = useState<string>("00000000-0000-0000-0000-000000000002");

  // Authentication & Guest Session lobby state
  const [guestNameInput, setGuestNameInput] = useState("");
  const [isLobbyJoined, setIsLobbyJoined] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestId, setGuestId] = useState("");

  // Product Catalogue state
  const [loading, setLoading] = useState(true);
  const [tableData, setTableData] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Customization Topping Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [modalToppings, setModalToppings] = useState<Topping[]>([]);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [modalNote, setModalNote] = useState("");

  // Notification overlays
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orderSubmittedSuccess, setOrderSubmittedSuccess] = useState<any>(null);

  // Category horizontal scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Multiplayer Hook Integration
  const {
    activeGuests,
    cartItems,
    isConnected,
    loading: hookLoading,
    joinSession,
    updateCartItem,
    submitOrder,
  } = useTableCart(tenantId, branchId, tableId, guestId, guestName);

  // Initialize tenant and local session recovery
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isValidUuid = (val: string) =>
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);

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
          resolvedTenantId = "00000000-0000-0000-0000-000000000001";
        }
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTenantId(resolvedTenantId);

      // Session recovery check
      const savedGuestId = localStorage.getItem(`kioskflow:guest_id:${tableId}`);
      const savedGuestName = localStorage.getItem(`kioskflow:guest_name:${tableId}`);

      if (savedGuestId && savedGuestName) {
        setGuestId(savedGuestId);
        setGuestName(savedGuestName);
        setIsLobbyJoined(true);
      }
    }
  }, [tableId]);

  // Load Catalogue data
  useEffect(() => {
    if (!tableId) return;

    const fetchCatalogue = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        const tableClient = getAuthenticatedClient(TableService, tenantId);
        const categoryClient = getAuthenticatedClient(CategoryService, tenantId);
        const productClient = getAuthenticatedClient(ProductService, tenantId);

        const tableResp = await tableClient.getTable({ id: tableId });
        setTableData(tableResp);
        if (tableResp.branchId) {
          setBranchId(tableResp.branchId);
        }

        const catResp = await categoryClient.listCategories({ page: 1, pageSize: 100 });
        setCategories(catResp.categories);

        const prodResp = await productClient.listProducts({
          pagination: { page: 1, pageSize: 200 }
        });
        setProducts(prodResp.products.filter(p => p.isActive));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error("Error fetching table catalogue:", err);
        setErrorMsg("Không thể kết nối đến máy chủ thực đơn. Vui lòng thử lại!");
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogue();
  }, [tableId, tenantId]);

  // Format currency helpers
  const formatCurrency = (money?: Money) => {
    if (!money) return "0 ₫";
    const amount = Number(money.units || BigInt(0));
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
  };

  const getProductPriceNumber = (product: Product) => Number(product.price?.units || BigInt(0));
  const getToppingPriceNumber = (topping: Topping) => Number(topping.price?.units || BigInt(0));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getCartItemPriceNumber = (item: any) => Number(item.price?.units || BigInt(0));

  const sharedCartTotal = () => {
    return cartItems.reduce((sum, item) => sum + getCartItemPriceNumber(item) * item.quantity, 0);
  };

  const sharedCartCount = () => {
    return cartItems.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Catalogue filters
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Lobby Join handler
  const handleJoinLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNameInput.trim()) return;

    try {
      const gName = guestNameInput.trim();
      const resolvedGuestId = await joinSession(gName);
      if (resolvedGuestId) {
        setGuestId(resolvedGuestId);
        setGuestName(gName);
        setIsLobbyJoined(true);
      }
    } catch (err) {
      console.error("Failed to join multiplayer lobby:", err);
      setErrorMsg("Không thể tham gia phiên bàn này. Vui lòng tải lại trang!");
    }
  };

  // Topping Customization
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

  // Add customized item to the Shared Multiplayer Cart
  const handleAddProductToSharedCart = async () => {
    if (!selectedProduct) return;

    try {
      await updateCartItem(
        selectedProduct.id,
        modalQuantity,
        modalNote,
        modalToppings.map(t => t.id)
      );

      setSelectedProduct(null);
      setSuccessMsg(`Đã thêm ${selectedProduct.name} vào giỏ hàng chung!`);
      setTimeout(() => setSuccessMsg(null), 2500);
    } catch (err) {
      console.error("Error adding to multiplayer cart:", err);
      setErrorMsg("Không thể thêm món vào giỏ hàng chung.");
    }
  };

  // Mutate item in shared cart
  const handleUpdateQuantity = async (productId: string, change: number, note: string = "", toppings: string[] = []) => {
    try {
      await updateCartItem(productId, change, note, toppings);
    } catch (err) {
      console.error("Failed to update item quantity in shared cart:", err);
    }
  };

  // Submit and checkout order
  const handleCheckoutSharedCart = async () => {
    if (cartItems.length === 0) return;

    try {
      const response = await submitOrder(orderNote.trim());
      if (response && response.success) {
        setOrderSubmittedSuccess(response);
        setIsCartOpen(false);
      }
    } catch (err) {
      console.error("Failed to submit shared table order:", err);
      setErrorMsg("Có lỗi xảy ra khi xác nhận đặt món. Vui lòng liên hệ quầy thu ngân!");
    }
  };

  // Return to order screen from success checkout
  const handleResetCheckout = () => {
    setOrderSubmittedSuccess(null);
    setIsLobbyJoined(false);
    setGuestName("");
    setGuestId("");
    setGuestNameInput("");
  };

  // LOADING STATE
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 text-neutral-200 p-6">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin"></div>
        </div>
        <p className="text-neutral-400 font-black uppercase tracking-widest text-xs animate-pulse">
          Đang nạp thực đơn bàn...
        </p>
      </div>
    );
  }

  // ORDER SUBMITTED SUCCESS SCREEN
  if (orderSubmittedSuccess) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans justify-center items-center p-6 relative overflow-hidden">
        {/* Glow Spheres */}
        <div className="absolute top-[-10%] left-[-20%] w-[90vw] h-[90vw] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[90vw] h-[90vw] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

        <div className="max-w-md w-full text-center space-y-8 bg-neutral-900/60 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl relative">
          <div className="mx-auto w-24 h-24 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center relative">
            <Check className="w-12 h-12 text-amber-400 stroke-[3]" />
            <div className="absolute -inset-2 rounded-full border border-amber-500/20 animate-ping opacity-30"></div>
          </div>

          <div className="space-y-3">
            <h2 className="text-3xl font-black uppercase tracking-tight italic text-amber-400">Đã gửi món thành công!</h2>
            <p className="text-neutral-400 text-xs font-semibold uppercase tracking-wider">
              Mã đơn hàng: <span className="font-mono text-white">#{orderSubmittedSuccess.orderNumber}</span>
            </p>
            <p className="text-neutral-400 text-sm leading-relaxed">
              Các Bartender tại <span className="text-white font-bold">KioskFlow</span> đang bắt đầu chuẩn bị món ngon cho bàn của bạn.
            </p>
          </div>

          <div className="bg-neutral-950/80 border border-white/5 rounded-2xl p-5 text-left space-y-3">
            <div className="flex justify-between items-center text-xs font-bold text-neutral-500 uppercase tracking-widest pb-2 border-b border-white/5">
              <span>Đơn vị</span>
              <span>Trạng thái</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-black text-neutral-200">{tableData?.name || "Bàn gọi món"}</span>
              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 font-extrabold text-[10px] uppercase rounded-full tracking-wider animate-pulse">
                Đang chuẩn bị
              </span>
            </div>
          </div>

          <button
            onClick={handleResetCheckout}
            className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black uppercase tracking-wider text-xs shadow-xl shadow-amber-500/10 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Quay lại trang đặt món
          </button>
        </div>
      </div>
    );
  }

  // MULTIPLAYER LOBBY WELCOME SCREEN
  if (!isLobbyJoined) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
        {/* Decorative background glows */}
        <div className="absolute top-[-20%] left-[-20%] w-[100vw] h-[100vw] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[100vw] h-[100vw] rounded-full bg-amber-500/5 blur-[150px] pointer-events-none"></div>

        <div className="max-w-md w-full bg-neutral-900/60 backdrop-blur-2xl border border-white/10 p-8 rounded-3xl shadow-2xl space-y-8 relative">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Utensils className="w-8 h-8 text-amber-500 animate-float" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-black text-amber-500 tracking-[0.3em] block mb-1">
                KioskFlow Cafe
              </span>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white">
                Bàn {tableData?.name || "Gọi Món"}
              </h2>
            </div>
            <p className="text-neutral-400 text-xs leading-relaxed max-w-xs mx-auto">
              Nhập tên của bạn để tham gia phòng đặt món thực tế ảo. Mọi người ở cùng bàn sẽ thấy giỏ hàng của nhau trong thời gian thực!
            </p>
          </div>

          <form onSubmit={handleJoinLobby} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Tên của bạn</label>
              <input
                type="text"
                placeholder="Ví dụ: Hoàng, Linh..."
                value={guestNameInput}
                onChange={(e) => setGuestNameInput(e.target.value)}
                maxLength={25}
                required
                className="w-full bg-neutral-950 border border-white/10 hover:border-white/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl py-4 px-5 text-sm text-white placeholder-neutral-600 outline-none transition-all shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={hookLoading || !guestNameInput.trim()}
              className="w-full py-4.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:pointer-events-none text-black font-black uppercase tracking-wider text-xs shadow-xl shadow-amber-500/10 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {hookLoading ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-neutral-950 border-t-transparent animate-spin"></div>
                  <span>Đang kết nối...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Tham gia đặt món chung</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MAIN CATALOGUE & MULTIPLAYER ORDER VIEW
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col font-sans pb-28 relative overflow-hidden">
      {/* Decorative backdrop elements */}
      <div className="absolute top-0 left-[-10vw] w-[50vw] h-[50vw] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute top-[40vh] right-[-10vw] w-[50vw] h-[50vw] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none"></div>

      {/* STICKY MULTIPLAYER HEADER */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-neutral-950/80 border-b border-white/5 px-4 py-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-ping" : "bg-red-500"}`}></div>
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-black tracking-widest text-amber-500">PHÒNG ĐỒNG BỘ TRỰC TUYẾN</span>
              <span className="text-xs text-neutral-400 font-bold flex items-center gap-1.5">
                <Wifi className={`w-3.5 h-3.5 ${isConnected ? "text-emerald-400 animate-pulse" : "text-red-500"}`} /> {isConnected ? "Live Synced Table Cart" : "Connecting..."}
              </span>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-full scale-105"></div>
            <span className="relative z-10 px-3.5 py-1.5 rounded-full bg-neutral-900 border border-white/10 text-amber-400 text-xs font-black shadow-lg">
              BÀN {tableData?.name || "01"}
            </span>
          </div>
        </div>

        {/* Real-time active guests visualizer */}
        <div className="flex items-center gap-3 bg-neutral-900/50 border border-white/5 rounded-2xl p-3">
          <div className="flex items-center gap-1.5 text-neutral-400 font-bold text-[10px] uppercase tracking-wider">
            <Users className="w-4 h-4 text-amber-500" />
            <span>Đang ở bàn ({activeGuests.length}):</span>
          </div>
          
          <div className="flex flex-wrap gap-1.5 flex-1 items-center">
            {activeGuests.map((guest) => (
              <span 
                key={guest.guestId}
                className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider transition-all duration-300 ${
                  guest.guestId === guestId
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/5"
                    : "bg-white/5 border-white/5 text-neutral-300"
                }`}
              >
                {guest.guestName} {guest.guestId === guestId && "(Bạn)"}
              </span>
            ))}
          </div>
        </div>
      </header>

      {/* CORE CONTROLS */}
      <div className="px-4 pt-5 pb-2">
        {/* Search */}
        <div className="relative mb-5">
          <input
            type="text"
            placeholder="Tìm món uống bạn yêu thích..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-neutral-900/60 border border-white/10 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-2xl py-3.5 pl-11 pr-10 text-sm text-white placeholder-neutral-600 outline-none transition-all duration-300 shadow-lg"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
            <Search className="w-4 h-4 stroke-[2.5]" />
          </div>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          )}
        </div>

        {/* Categories selector */}
        <div className="flex items-center gap-2 mb-4 overflow-hidden relative">
          <div 
            ref={categoryScrollRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4.5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 flex-shrink-0 snap-align-start border ${
                selectedCategory === "all"
                  ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/10"
                  : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white"
              }`}
            >
              Tất cả
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4.5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 flex-shrink-0 snap-align-start border ${
                  selectedCategory === category.id
                    ? "bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/10"
                    : "bg-neutral-900 border-white/5 text-neutral-400 hover:text-white"
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FLOAT NOTIFICATIONS */}
      {successMsg && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-amber-500 text-black text-xs font-extrabold shadow-2xl border border-amber-500/30 flex items-center gap-2 animate-bounce">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mx-4 mb-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs leading-relaxed flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* CATALOGUE PRODUCTS GRID */}
      <main className="flex-1 px-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-neutral-600">
            <Coffee className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-bold uppercase tracking-wider">Không tìm thấy sản phẩm</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const hasToppings = product.allowTopping && product.toppings && product.toppings.length > 0;
              return (
                <div
                  key={product.id}
                  className="bg-neutral-900/40 border border-white/5 rounded-2xl p-4.5 flex flex-col justify-between hover:border-amber-500/30 hover:shadow-lg transition-all duration-300 group shadow-md"
                >
                  <div>
                    {/* Visual container */}
                    <div className="relative aspect-square w-full rounded-xl bg-neutral-950 overflow-hidden mb-3 border border-white/5 flex items-center justify-center">
                      {product.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4">
                          <Coffee className="w-10 h-10 text-amber-500/40 group-hover:animate-float" />
                          <span className="text-[8px] uppercase tracking-wider text-neutral-600 font-black mt-2">KioskFlow</span>
                        </div>
                      )}
                      
                      {hasToppings && (
                        <span className="absolute top-2 left-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[8px] font-black px-2 py-0.5 rounded-md shadow-md uppercase tracking-widest">
                          Topping
                        </span>
                      )}
                    </div>

                    <h3 className="font-black text-white text-sm line-clamp-1 mb-1">{product.name}</h3>
                    {product.description && (
                      <p className="text-neutral-500 text-[11px] line-clamp-2 leading-relaxed mb-2">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <span className="font-mono text-amber-400 font-bold text-xs">
                      {formatCurrency(product.price)}
                    </span>
                    <button
                      onClick={() => openToppingModal(product)}
                      className="h-8 w-8 rounded-full bg-amber-500 hover:bg-amber-400 active:scale-95 flex items-center justify-center text-black shadow-md shadow-amber-500/10 transition-all duration-200 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* TOPPING & NOTE CUSTOMIZATION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 bg-black/80 backdrop-blur-sm transition-all duration-300">
          <div className="w-full max-w-md bg-neutral-900 border-t border-white/10 rounded-t-3xl overflow-hidden shadow-2xl p-6 flex flex-col gap-4 animate-[slideUp_0.3s_ease-out]">
            
            <div className="w-12 h-1.5 rounded-full bg-neutral-800 mx-auto mb-1"></div>

            <div className="flex justify-between items-start">
              <div className="flex-1 pr-3">
                <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">Tùy biến món uống</span>
                <h3 className="text-lg font-black text-white mt-0.5">{selectedProduct.name}</h3>
                <p className="text-xs text-amber-400 font-mono mt-1 font-semibold">
                  Đơn giá: {formatCurrency(selectedProduct.price)}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            {/* Toppings selection */}
            {selectedProduct.allowTopping && selectedProduct.toppings && selectedProduct.toppings.length > 0 && (
              <div className="flex flex-col gap-2 max-h-[35vh] overflow-y-auto pr-1">
                <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5">Chọn thêm Topping</h4>
                {selectedProduct.toppings.filter(t => t.isActive).map(topping => {
                  const isChecked = modalToppings.some(t => t.id === topping.id);
                  return (
                    <button
                      key={topping.id}
                      onClick={() => toggleModalTopping(topping)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                        isChecked
                          ? "bg-amber-500/10 border-amber-500 text-amber-400"
                          : "bg-neutral-950 border-white/5 text-neutral-400 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                          isChecked ? "bg-amber-500 border-amber-500" : "border-neutral-800 bg-neutral-950"
                        }`}>
                          {isChecked && <Check className="w-2.5 h-2.5 text-black stroke-[3]" />}
                        </div>
                        <span className="font-bold text-white">{topping.name}</span>
                      </div>
                      <span className="font-mono text-amber-400 font-semibold">+{formatCurrency(topping.price)}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Note Special Instructions */}
            <div className="flex flex-col gap-1.5">
              <h4 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Ghi chú đặc biệt</h4>
              <textarea
                placeholder="Ví dụ: Ít đường, ít đá, thêm sữa..."
                value={modalNote}
                onChange={(e) => setModalNote(e.target.value)}
                rows={2}
                className="w-full bg-neutral-950 border border-white/10 hover:border-white/20 focus:border-amber-500 rounded-xl p-3 text-xs text-white placeholder-neutral-600 outline-none resize-none transition-all"
              />
            </div>

            {/* Quantity Controls & Add Button */}
            <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-1">
              <div className="flex items-center gap-3 bg-neutral-950 border border-white/10 rounded-xl p-1.5">
                <button
                  disabled={modalQuantity <= 1}
                  onClick={() => setModalQuantity(modalQuantity - 1)}
                  className="h-7 w-7 rounded-lg bg-neutral-900 text-neutral-400 border border-white/5 hover:text-white flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold text-sm text-white w-6 text-center">{modalQuantity}</span>
                <button
                  onClick={() => setModalQuantity(modalQuantity + 1)}
                  className="h-7 w-7 rounded-lg bg-neutral-900 text-neutral-400 border border-white/5 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddProductToSharedCart}
                className="flex-1 ml-4 py-3.5 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-xs uppercase tracking-wider text-black shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 active:scale-98 transition-all cursor-pointer"
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

      {/* FLOAT SHARED CART BAR */}
      {cartItems.length > 0 && !isCartOpen && (
        <div className="fixed bottom-0 inset-x-0 z-40 px-4 pb-5 pt-3 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-md mx-auto py-4.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:scale-102 flex items-center justify-between text-black shadow-2xl shadow-amber-500/20 active:scale-98 transition-all duration-300 animate-pulse cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-lg bg-black text-white text-xs font-black flex items-center justify-center">
                {sharedCartCount()}
              </span>
              <span className="text-xs font-black uppercase tracking-wider">Xem giỏ hàng chung của bàn</span>
            </div>
            <span className="font-mono font-black text-sm tracking-wide">{formatCurrency(new Money({ units: BigInt(sharedCartTotal()) }))}</span>
          </button>
        </div>
      )}

      {/* MULTIPLAYER CART DETAILS SLIDE DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end justify-center p-0 transition-all duration-300 font-sans">
          <div className="w-full max-w-md bg-neutral-900 border-t border-white/10 rounded-t-3xl overflow-hidden shadow-2xl p-6 flex flex-col max-h-[85vh] animate-[slideUp_0.3s_ease-out]">
            
            <div className="w-12 h-1.5 rounded-full bg-neutral-800 mx-auto mb-2 flex-shrink-0"></div>

            <div className="flex justify-between items-center border-b border-white/5 pb-3.5 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-lg font-black text-white uppercase italic tracking-tighter">Giỏ hàng bàn {tableData?.name || ""}</span>
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono px-2 py-0.5 rounded font-black tracking-widest uppercase">
                  {sharedCartCount()} món
                </span>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            {/* Scrollable shared items list */}
            <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 pr-1">
              {cartItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-neutral-950 border border-white/5 rounded-2xl p-4 flex justify-between items-start gap-4 relative overflow-hidden group hover:border-amber-500/20 transition-all"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-white text-sm leading-snug">{item.productName}</h4>
                      {/* Added by guest name badge */}
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-black text-[8px] uppercase tracking-wider">
                        Bởi {item.addedByGuestName}
                      </span>
                    </div>

                    {item.toppingIds && item.toppingIds.length > 0 && (
                      <p className="text-[11px] text-neutral-500 leading-normal">
                        Toppings: {item.toppingIds.join(", ")}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-[11px] text-amber-500/80 italic leading-normal">
                        Ghi chú: {item.note}
                      </p>
                    )}
                    <p className="font-mono text-amber-400 text-xs font-bold pt-1.5">
                      {formatCurrency(new Money({ units: BigInt(getCartItemPriceNumber(item) * item.quantity) }))}
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5 bg-neutral-900 border border-white/5 rounded-lg p-1 flex-shrink-0">
                    <button
                      onClick={() => handleUpdateQuantity(item.productId, -1, item.note, item.toppingIds)}
                      className="h-6 w-6 rounded bg-neutral-950 text-neutral-400 hover:text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-mono font-bold text-xs text-white w-5 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.productId, 1, item.note, item.toppingIds)}
                      className="h-6 w-6 rounded bg-neutral-950 text-neutral-400 hover:text-white font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Validation & Place Order Footer */}
            <div className="border-t border-white/5 pt-4 flex flex-col gap-4 flex-shrink-0">
              
              <div className="space-y-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">
                    Ghi chú cho quầy thu ngân (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    placeholder="Ghi chú chung cho toàn bộ bàn uống..."
                    value={orderNote}
                    onChange={(e) => setOrderNote(e.target.value)}
                    className="w-full bg-neutral-950 border border-white/10 hover:border-white/20 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl py-3 px-4 text-xs text-white placeholder-neutral-700 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Shared Cart Total Display */}
              <div className="flex justify-between items-center text-sm pt-2">
                <span className="font-bold text-neutral-400 uppercase tracking-wider text-xs">Tổng thanh toán chung</span>
                <span className="font-mono text-amber-400 font-black text-lg">
                  {formatCurrency(new Money({ units: BigInt(sharedCartTotal()) }))}
                </span>
              </div>

              {/* Submit CTA Button */}
              <button
                onClick={handleCheckoutSharedCart}
                disabled={hookLoading || cartItems.length === 0}
                className="w-full py-4.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 disabled:pointer-events-none text-black font-black text-xs uppercase tracking-wider shadow-xl shadow-amber-500/10 flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
              >
                {hookLoading ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin"></div>
                    <span>Đang gửi đơn hàng...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    <span>Gửi yêu cầu đặt món ({sharedCartCount()})</span>
                  </>
                )}
              </button>

            </div>

          </div>
        </div>
      )}

      {/* Global CSS transition animations */}
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
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
