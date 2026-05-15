# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth.spec.ts >> Authentication Flow >> should show error with invalid credentials
- Location: e2e\auth.spec.ts:18:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText(/Invalid credentials|Email hoặc mật khẩu/i)
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/Invalid credentials|Email hoặc mật khẩu/i)
    9 × locator resolved to <div id="nextjs__container_errors_desc" class="nextjs__container_errors_desc ">[unauthenticated] Invalid credentials</div>
      - unexpected value "hidden"

```

```yaml
- heading "KioskFlow" [level=1]
- paragraph: Hệ thống vận hành thông minh
- text: Mã cửa hàng
- textbox "Mã cửa hàng":
  - /placeholder: SLUG-CUA-HANG
  - text: demo
- text: Email quản trị
- textbox "Email quản trị":
  - /placeholder: admin@kioskflow.vn
  - text: wrong@email.com
- text: Mật khẩu
- textbox "Mật khẩu":
  - /placeholder: ••••••••
  - text: wrongpassword
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
  3  | test.describe('Authentication Flow', () => {
  4  |   test('should login successfully with valid credentials', async ({ page }) => {
  5  |     await page.goto('/auth/login');
  6  | 
  7  |     // Fill the login form
  8  |     await page.fill('#tenantSlug', 'demo');
  9  |     await page.fill('#email', 'admin@demo.com');
  10 |     await page.fill('#password', 'password123');
  11 |     await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
  12 |     await expect(page).toHaveURL(/\/dashboard/);
  13 |     
  14 |     // Check if dashboard content is visible
  15 |     await expect(page.locator('h1')).toContainText(/Xin chào/i);
  16 |   });
  17 | 
  18 |   test('should show error with invalid credentials', async ({ page }) => {
  19 |     await page.goto('/auth/login');
  20 | 
  21 |     await page.fill('#tenantSlug', 'demo');
  22 |     await page.fill('#email', 'wrong@email.com');
  23 |     await page.fill('#password', 'wrongpassword');
  24 | 
  25 |     await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
  26 | 
  27 |     // Check for error message
> 28 |     await expect(page.getByText(/Invalid credentials|Email hoặc mật khẩu/i)).toBeVisible();
     |                                                                              ^ Error: expect(locator).toBeVisible() failed
  29 |   });
  30 | 
  31 |   test('should logout successfully', async ({ page }) => {
  32 |     // Login first
  33 |     await page.goto('/auth/login');
  34 |     await page.fill('#tenantSlug', 'demo');
  35 |     await page.fill('#email', 'admin@demo.com');
  36 |     await page.fill('#password', 'password123');
  37 |     await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
  38 |     await expect(page).toHaveURL(/\/dashboard/);
  39 | 
  40 |     // Click logout button (assuming it's in the sidebar or header)
  41 |     // I need to check where the logout button is.
  42 |     // Let's assume there's a logout button with "Đăng xuất" text.
  43 |     await page.click('button:has-text("Đăng xuất")');
  44 | 
  45 |     // Should redirect back to login
  46 |     await expect(page).toHaveURL(/\/auth\/login/);
  47 |   });
  48 | });
  49 | 
```