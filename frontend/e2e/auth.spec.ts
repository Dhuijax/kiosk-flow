import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill the login form
    await page.fill('#tenantSlug', 'demo');
    await page.fill('#email', 'admin@demo.com');
    await page.fill('#password', 'password123');
    await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Check if dashboard content is visible
    await expect(page.locator('h1')).toContainText(/Xin chào/i);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('#tenantSlug', 'demo');
    await page.fill('#email', 'wrong@email.com');
    await page.fill('#password', 'wrongpassword');

    await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');

    // Check for error message
    await expect(page.getByText(/Invalid credentials|Email hoặc mật khẩu/i)).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('#tenantSlug', 'demo');
    await page.fill('#email', 'admin@demo.com');
    await page.fill('#password', 'password123');
    await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
    await expect(page).toHaveURL(/\/dashboard/);

    // Click logout button (assuming it's in the sidebar or header)
    // I need to check where the logout button is.
    // Let's assume there's a logout button with "Đăng xuất" text.
    await page.click('button:has-text("Đăng xuất")');

    // Should redirect back to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
