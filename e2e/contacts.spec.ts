import { test, expect } from '@playwright/test';

const mockContacts = [
  { id: 1, firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com', phone: '555-0001', address: '1 Test St' },
  { id: 2, firstName: 'Bob',   lastName: 'Jones', email: 'bob@example.com',   phone: '555-0002', address: '2 Test St' },
];

test('loads and shows the header', async ({ page }) => {
  await page.route('**/api/contacts', (route) => route.fulfill({ status: 200, json: mockContacts }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Address Book', exact: true })).toBeVisible();
});

test('lists contacts from the proxy', async ({ page }) => {
  await page.route('**/api/contacts', (route) => route.fulfill({ status: 200, json: mockContacts }));
  await page.goto('/');
  await expect(page.getByText('Contacts (2)')).toBeVisible();
  await expect(page.getByText('Alice Smith')).toBeVisible();
  await expect(page.getByText('Bob Jones')).toBeVisible();
});

test('shows details when a contact is clicked', async ({ page }) => {
  await page.route('**/api/contacts', (route) => route.fulfill({ status: 200, json: mockContacts }));
  await page.goto('/');
  await page.getByText('Alice Smith').click();
  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: 'Alice Smith', exact: true })).toBeVisible();
  await expect(main.getByText('alice@example.com')).toBeVisible();
  await expect(main.getByText('1 Test St')).toBeVisible();
});

test('shows an error state when the upstream returns 502', async ({ page }) => {
  await page.route('**/api/contacts', (route) => route.fulfill({ status: 502, json: { error: 'Upstream down' } }));
  await page.goto('/');
  await expect(page.getByText(/Error:/)).toBeVisible();
});
