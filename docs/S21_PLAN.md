# Sprint S21: Inventory UI (Stock Management Dashboard)

## 1. Overview
Xây dựng giao diện quản lý tồn kho chuyên nghiệp cho Admin, cho phép theo dõi mức tồn kho, điều chỉnh số lượng thủ công và xem lịch sử biến động kho của từng sản phẩm.

## 2. Technical Stack
- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Framer Motion.
- **State Management**: React Query (TanStack Query) cho gRPC-Web calls.
- **Icons**: Lucide React.
- **UI Components**: Custom reusable components (Table, Modal, Badge, Input).

## 3. UI/UX Design (Premium Architecture)
- **Layout**: Glassmorphism cards, Deep Navy theme (#0F172A).
- **Status Badges & Metrics**: 
  - `Out of Stock`: Red accent (#EF4444) - "Đã hết hàng".
  - `Low Stock`: Amber accent (#F59E0B) + Pulse animation - "Sắp hết hàng".
  - `Recent Activity`: "Giao dịch kho gần đây" card hiển thị 5 giao dịch mới nhất.
- **Typography**: Inter cho văn bản, JetBrains Mono cho số lượng tồn kho.

## 4. Work Breakdown Structure (WBS)

### Task 1: gRPC Hooks & Types
- [x] Khởi tạo `useInventory` hook từ `@/lib/grpc/client`.
- [x] Implement query `ListStock` với hỗ trợ phân trang và filter `low_stock_only`.
- [x] Implement mutation `UpdateStock` cho các thao tác điều chỉnh.

### Task 2: Inventory Dashboard (Main Page)
- [x] **Stock Stats Overview**: Hiển thị 3 cards: Tổng mặt hàng, Mặt hàng sắp hết, Mặt hàng hết hàng.
- [x] **Main Table**: 
  - Hiển thị: Tên SP, SKU, Chi nhánh, Tồn thực tế, Định mức (Min Stock), Trạng thái.
  - Action: Nút "Điều chỉnh" và "Lịch sử".
- [x] **Filter Bar**: Tìm kiếm theo tên/SKU và toggle "Chỉ hiện hàng sắp hết".

### Task 3: Adjustment & History Modals
- [x] **StockAdjustmentModal**: 
  - Form nhập Số lượng thay đổi (`quantity_change`).
  - Dropdown **Lý do điều chỉnh** (Hàng hỏng, Kiểm kho, Thất thoát, Hàng mẫu...).
  - Ghi chú (`note`).
- [x] **StockHistoryModal**: 
  - Bảng hiển thị lịch sử giao dịch kho (`inventory_transactions`).
  - Hỗ trợ **Filter theo Chi nhánh** và **Sản phẩm** ngay tại giao diện log.

### Task 4: Polish & Interaction
- [x] Thêm hiệu ứng Framer Motion khi mở Modal và hover vào các dòng trong bảng.
- [x] Thông báo Toast (Success/Error) khi cập nhật kho thành công.

## 5. Verification Criteria
1. [x] Truy cập `/inventory` hiển thị đúng danh sách SP từ database.
2. [x] Filter "Low Stock" chỉ hiện SP có `quantity <= min_quantity`.
3. [x] Thực hiện điều chỉnh kho thủ công → Số lượng trên bảng cập nhật ngay lập tức.
4. [x] Xem lịch sử SP hiện đúng dòng bản ghi vừa điều chỉnh.

## 6. Feedback Integration (Confirmed)
- [x] Metric nổi bật: Sắp hết hàng, Đã hết hàng, Giao dịch gần đây.
- [x] Reason codes: Đã tích hợp vào form điều chỉnh.
- [x] Log filters: Tích hợp lọc theo Branch và Product.
