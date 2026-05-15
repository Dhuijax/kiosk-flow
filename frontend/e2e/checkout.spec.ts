import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('#tenantSlug', 'demo');
    await page.fill('#email', 'admin@demo.com');
    await page.fill('#password', 'password123');
    await page.click('button:has-text("BẮT ĐẦU VẬN HÀNH")');
    await expect(page).toHaveURL(/\/dashboard/);
    
    // Go directly to order page to save time
    await page.goto('/pos/order');
  });

  test('should complete checkout with cash payment', async ({ page }) => {
    // Add a product
    const firstProduct = page.locator('button[aria-label]').first();
    await firstProduct.click();

    // Click Checkout button
    await page.click('button:has-text("XÁC NHẬN ĐƠN HÀNG")');
 
    // Payment modal should open
    await expect(page.locator('h2')).toContainText(/Thanh toán/i);
 
    // Select Cash (Tiền mặt)
    await page.click('button:has-text("TIỀN MẶT")');
 
    // Confirm payment
    await page.click('button:has-text("HOÀN TẤT THANH TOÁN")');

    // Wait for success toast
    await expect(page.locator('text=Thanh toán & Đặt hàng thành công')).toBeVisible({ timeout: 10000 });
  });
});
