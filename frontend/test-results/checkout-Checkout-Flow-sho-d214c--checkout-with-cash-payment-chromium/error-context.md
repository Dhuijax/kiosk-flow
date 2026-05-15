# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout.spec.ts >> Checkout Flow >> should complete checkout with cash payment
- Location: e2e\checkout.spec.ts:16:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("XÁC NHẬN ĐƠN HÀNG")')
    - locator resolved to <button disabled class="w-full py-8 flex items-center justify-center gap-4 rounded-3xl font-black text-2xl uppercase italic tracking-tighter transition-all border bg-muted text-foreground/20 border-foreground/10 cursor-not-allowed">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    48 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link [ref=e5] [cursor=pointer]:
          - /url: /dashboard
          - img [ref=e7]
        - generic [ref=e9]:
          - img [ref=e11]
          - generic [ref=e15]:
            - paragraph [ref=e16]: Chi nhánh
            - paragraph [ref=e17]: Cửa hàng chính
      - generic [ref=e18]:
        - generic [ref=e19]:
          - img [ref=e20]
          - generic [ref=e23]: 10:23
        - generic [ref=e24]:
          - generic [ref=e25]:
            - paragraph [ref=e26]: Cashier Mode
            - generic [ref=e29]: Online
          - img [ref=e31]
        - button "Đăng xuất" [ref=e34]:
          - img [ref=e35]
    - main [ref=e38]:
      - generic [ref=e39]:
        - heading "Hệ thống Kiosk AI - KioskFlow" [level=1] [ref=e40]
        - generic [ref=e41]:
          - generic [ref=e43]:
            - img [ref=e44]
            - textbox "TÌM KIẾM SẢN PHẨM..." [ref=e47]
          - button "LỌC" [ref=e49]:
            - img [ref=e50]
            - text: LỌC
        - generic [ref=e52]:
          - generic [ref=e53]:
            - generic [ref=e56]:
              - button [ref=e57]:
                - img [ref=e58]
              - generic [ref=e60]:
                - button "TẤT CẢ" [ref=e61]:
                  - img [ref=e62]
                  - text: TẤT CẢ
                - button "Category B" [ref=e66]
                - button "Category A" [ref=e67]
                - button "Bánh ngọt" [ref=e68]
                - button "Trà sữa" [ref=e69]
                - button "Cà phê" [ref=e70]
                - button "Category B" [ref=e71]
                - button "Category A" [ref=e72]
              - button [ref=e73]:
                - img [ref=e74]
            - generic "Danh sách thực đơn sản phẩm" [ref=e78]:
              - generic [ref=e79]:
                - button "Croissant" [ref=e80]:
                  - generic [ref=e81]:
                    - img [ref=e82]
                    - generic [ref=e86]:
                      - img [ref=e87]
                      - generic [ref=e90]: Thông minh
                    - img [ref=e92]
                  - generic [ref=e93]:
                    - heading "Croissant" [level=3] [ref=e94]
                    - generic [ref=e96]:
                      - generic [ref=e97]: Giá bán
                      - generic [ref=e98]: 20.000 ₫
                - button "Trà sữa matcha" [ref=e99]:
                  - generic [ref=e100]:
                    - img [ref=e101]
                    - generic [ref=e105]:
                      - img [ref=e106]
                      - generic [ref=e109]: Thông minh
                    - img [ref=e111]
                  - generic [ref=e112]:
                    - heading "Trà sữa matcha" [level=3] [ref=e113]
                    - generic [ref=e115]:
                      - generic [ref=e116]: Giá bán
                      - generic [ref=e117]: 45.000 ₫
                - button "Trà sữa truyền thống" [ref=e118]:
                  - generic [ref=e119]:
                    - img [ref=e120]
                    - generic [ref=e124]:
                      - img [ref=e125]
                      - generic [ref=e128]: Thông minh
                    - img [ref=e130]
                  - generic [ref=e131]:
                    - heading "Trà sữa truyền thống" [level=3] [ref=e132]
                    - generic [ref=e134]:
                      - generic [ref=e135]: Giá bán
                      - generic [ref=e136]: 35.000 ₫
                - button "Cà phê sữa" [ref=e137]:
                  - generic [ref=e138]:
                    - img [ref=e139]
                    - generic [ref=e143]:
                      - img [ref=e144]
                      - generic [ref=e147]: Thông minh
                    - img [ref=e149]
                  - generic [ref=e150]:
                    - heading "Cà phê sữa" [level=3] [ref=e151]
                    - generic [ref=e153]:
                      - generic [ref=e154]: Giá bán
                      - generic [ref=e155]: 29.000 ₫
                - button "Cà phê đen" [ref=e156]:
                  - generic [ref=e157]:
                    - img [ref=e158]
                    - generic [ref=e162]:
                      - img [ref=e163]
                      - generic [ref=e166]: Thông minh
                    - img [ref=e168]
                  - generic [ref=e169]:
                    - heading "Cà phê đen" [level=3] [ref=e170]
                    - generic [ref=e172]:
                      - generic [ref=e173]: Giá bán
                      - generic [ref=e174]: 25.000 ₫
          - generic "Tóm tắt đơn hàng" [ref=e176]:
            - generic [ref=e177]:
              - generic [ref=e178]:
                - heading "Đơn hàng" [level=2] [ref=e179]:
                  - img [ref=e180]
                  - text: Đơn hàng
                - paragraph [ref=e184]: Hệ thống AI đang hỗ trợ...
              - generic [ref=e185]:
                - button "Gọi món bằng giọng nói" [ref=e186]:
                  - img [ref=e187]
                - generic [ref=e190]: 0 MÓN
            - button "CHƯA CHỌN KHÁCH HÀNG BẤM ĐỂ TÌM KIẾM HOẶC ĐĂNG KÝ" [ref=e193]:
              - generic [ref=e194]:
                - img [ref=e196]
                - generic [ref=e199]:
                  - paragraph [ref=e200]: CHƯA CHỌN KHÁCH HÀNG
                  - paragraph [ref=e201]: BẤM ĐỂ TÌM KIẾM HOẶC ĐĂNG KÝ
              - img [ref=e202]
            - generic [ref=e206]:
              - generic [ref=e207]:
                - img [ref=e208]
                - img [ref=e212]
              - generic [ref=e215]:
                - paragraph [ref=e216]: Giỏ hàng đang trống
                - paragraph [ref=e217]:
                  - text: Nói "Gợi ý cho tôi món trà ngon"
                  - text: để bắt đầu trải nghiệm AI
            - generic [ref=e218]:
              - generic [ref=e219]:
                - generic [ref=e220]:
                  - generic [ref=e221]: Tạm tính
                  - generic [ref=e222]: 0 ₫
                - generic [ref=e223]:
                  - generic [ref=e224]: Thuế (10%)
                  - generic [ref=e225]: 0 ₫
                - generic [ref=e226]:
                  - generic [ref=e227]: TỔNG
                  - generic [ref=e228]: 0 ₫
              - button "XÁC NHẬN ĐƠN HÀNG" [disabled] [ref=e229]:
                - img [ref=e230]
                - text: XÁC NHẬN ĐƠN HÀNG
  - generic [active]:
    - menu "Next.js Dev Tools Items" [ref=e232]:
      - generic [ref=e233]:
        - menuitem "Issues 1" [ref=e234] [cursor=pointer]:
          - generic [ref=e235]: Issues
          - generic [ref=e237]: "1"
        - menuitem "Route Static" [ref=e239]:
          - generic [ref=e240]: Route
          - generic [ref=e241]: Static
        - generic "Turbopack is enabled." [ref=e242]:
          - generic [ref=e243]: Bundler
          - generic [ref=e244]: Turbopack
        - menuitem "Route Info" [ref=e245]:
          - generic [ref=e246]: Route Info
          - img [ref=e248]
      - menuitem "Preferences" [ref=e251]:
        - generic [ref=e252]: Preferences
        - img [ref=e254]
    - generic [ref=e260] [cursor=pointer]:
      - button "Close Next.js Dev Tools" [expanded] [ref=e261]:
        - img [ref=e262]
      - generic [ref=e265]:
        - button "Open issues overlay" [ref=e266]:
          - generic [ref=e267]:
            - generic [ref=e268]: "0"
            - generic [ref=e269]: "1"
          - generic [ref=e270]: Issue
        - button "Collapse issues badge" [ref=e271]:
          - img [ref=e272]
  - alert [ref=e274]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Checkout Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto('/auth/login');
  6  |     await page.fill('#tenantSlug', 'demo');
  7  |     await page.fill('#email', 'admin@demo.com');
  8  |     await page.fill('#password', 'password123');
  9  |     await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
  10 |     await expect(page).toHaveURL(/\/dashboard/);
  11 |     
  12 |     // Go directly to order page to save time
  13 |     await page.goto('/pos/order');
  14 |   });
  15 | 
  16 |   test('should complete checkout with cash payment', async ({ page }) => {
  17 |     // Add a product
  18 |     const firstProduct = page.locator('button[aria-label]').first();
  19 |     await firstProduct.click();
  20 | 
  21 |     // Click Checkout button
> 22 |     await page.click('button:has-text("XÁC NHẬN ĐƠN HÀNG")');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  23 |  
  24 |     // Payment modal should open
  25 |     await expect(page.locator('h2')).toContainText(/Thanh toán/i);
  26 |  
  27 |     // Select Cash (Tiền mặt)
  28 |     await page.click('button:has-text("TIỀN MẶT")');
  29 |  
  30 |     // Confirm payment
  31 |     await page.click('button:has-text("HOÀN TẤT THANH TOÁN")');
  32 | 
  33 |     // Wait for success toast
  34 |     await expect(page.locator('text=Thanh toán & Đặt hàng thành công')).toBeVisible({ timeout: 10000 });
  35 |   });
  36 | });
  37 | 
```