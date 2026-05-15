# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout.spec.ts >> Checkout Flow >> should complete checkout with cash payment
- Location: e2e\checkout.spec.ts:16:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/dashboard/
Received string:  "http://localhost:3000/auth/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:3000/auth/login"

```

```yaml
- heading "KioskFlow" [level=1]
- paragraph: Hệ thống vận hành thông minh
- text: Mã cửa hàng
- textbox "Mã cửa hàng":
  - /placeholder: SLUG-CUA-HANG
  - text: demodemo
- text: Email quản trị
- textbox "Email quản trị":
  - /placeholder: admin@kioskflow.vn
  - text: admin@demo.com
- text: Mật khẩu
- textbox "Mật khẩu":
  - /placeholder: ••••••••
  - text: password123
- text: Hệ thống đang bận. Vui lòng thử lại sau.
- button "BẮT ĐẦU VẬN HÀNH"
- text: Chưa có tài khoản?
- link "Liên hệ hỗ trợ":
  - /url: mailto:support@kioskflow.vn
- alert
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
> 10 |     await expect(page).toHaveURL(/\/dashboard/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
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
  22 |     await page.click('button:has-text("XÁC NHẬN ĐƠN HÀNG")');
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