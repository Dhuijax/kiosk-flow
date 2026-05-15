import { test, expect } from '@playwright/test';

test.describe('POS Ordering Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill('#tenantSlug', 'demo');
    await page.fill('#email', 'admin@demo.com');
    await page.fill('#password', 'password123');
    await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should navigate to POS and create an order', async ({ page }) => {
    // Navigate to POS (Bán hàng)
    await page.click('nav >> text=Bán hàng');
    
    // We expect to be on the order page
    await expect(page).toHaveURL(/\/pos\/order/);
    await expect(page.locator('h2')).toContainText(/Đơn hàng/i);

    // Select a product (e.g., "Cà phê đen")
    const product = page.locator('button:has-text("Cà phê đen")').first();
    await product.click();

    // Verify product added to cart/summary
    await expect(page.locator('text=Cà phê đen').first()).toBeVisible();

    // Check subtotal
    await expect(page.locator('text=TỔNG')).toBeVisible();
  });
});
