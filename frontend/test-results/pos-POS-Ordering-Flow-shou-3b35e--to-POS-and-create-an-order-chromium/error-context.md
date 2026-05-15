# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: pos.spec.ts >> POS Ordering Flow >> should navigate to POS and create an order
- Location: e2e\pos.spec.ts:14:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=Tổng cộng')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=Tổng cộng')

```

```yaml
- alert: Bán hàng - KioskFlow
- banner:
  - link:
    - /url: /dashboard
  - paragraph: Chi nhánh
  - paragraph: Cửa hàng chính
  - text: 10:21
  - paragraph: Cashier Mode
  - text: Online
  - button "Đăng xuất"
- main:
  - heading "Hệ thống Kiosk AI - KioskFlow" [level=1]
  - textbox "TÌM KIẾM SẢN PHẨM..."
  - button "LỌC"
  - button
  - button "TẤT CẢ"
  - button "Bánh ngọt"
  - button "Trà sữa"
  - button "Cà phê"
  - button "Category B"
  - button "Category A"
  - button
  - button "Croissant":
    - text: Thông minh
    - heading "Croissant" [level=3]
    - text: Giá bán 20.000 ₫
  - button "Trà sữa matcha":
    - text: Thông minh
    - heading "Trà sữa matcha" [level=3]
    - text: Giá bán 45.000 ₫
  - button "Trà sữa truyền thống":
    - text: Thông minh
    - heading "Trà sữa truyền thống" [level=3]
    - text: Giá bán 35.000 ₫
  - button "Cà phê sữa":
    - text: Thông minh
    - heading "Cà phê sữa" [level=3]
    - text: Giá bán 29.000 ₫
  - button "Cà phê đen":
    - text: Thông minh
    - heading "Cà phê đen" [level=3]
    - text: Giá bán 25.000 ₫
  - heading "Đơn hàng" [level=2]
  - paragraph: Hệ thống AI đang hỗ trợ...
  - button "Gọi món bằng giọng nói"
  - text: 1 MÓN
  - button "CHƯA CHỌN KHÁCH HÀNG BẤM ĐỂ TÌM KIẾM HOẶC ĐĂNG KÝ":
    - paragraph: CHƯA CHỌN KHÁCH HÀNG
    - paragraph: BẤM ĐỂ TÌM KIẾM HOẶC ĐĂNG KÝ
  - heading "Cà phê đen" [level=3]
  - paragraph: 25.000 ₫
  - button
  - button
  - text: "1"
  - button
  - paragraph: 25.000 ₫
  - text: Tạm tính 25.000 ₫ Thuế (10%) 2.500 ₫ TỔNG 27.500 ₫
  - button "XÁC NHẬN ĐƠN HÀNG"
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('POS Ordering Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login before each test
  6  |     await page.goto('/auth/login');
  7  |     await page.fill('#tenantSlug', 'demo');
  8  |     await page.fill('#email', 'admin@demo.com');
  9  |     await page.fill('#password', 'password123');
  10 |     await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
  11 |     await expect(page).toHaveURL(/\/dashboard/);
  12 |   });
  13 | 
  14 |   test('should navigate to POS and create an order', async ({ page }) => {
  15 |     // Navigate to POS (Bán hàng)
  16 |     await page.click('nav >> text=Bán hàng');
  17 |     
  18 |     // We expect to be on the order page
  19 |     await expect(page).toHaveURL(/\/pos\/order/);
  20 |     await expect(page.locator('h2')).toContainText(/Đơn hàng/i);
  21 | 
  22 |     // Select a product (e.g., "Cà phê đen")
  23 |     const product = page.locator('button:has-text("Cà phê đen")').first();
  24 |     await product.click();
  25 | 
  26 |     // Verify product added to cart/summary
  27 |     await expect(page.locator('text=Cà phê đen').first()).toBeVisible();
  28 | 
  29 |     // Check subtotal
> 30 |     await expect(page.locator('text=Tổng cộng')).toBeVisible();
     |                                                  ^ Error: expect(locator).toBeVisible() failed
  31 |   });
  32 | });
  33 | 
```