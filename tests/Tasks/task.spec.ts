import { test, expect, BrowserContext, Page } from '@playwright/test';
import prisma from '../../lib/prismadb';
import { Routes, User } from '@/consts';
import { pauseExecution } from '@/utils/axios';

test.describe('Task tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('http://localhost:3000');
  });

  test('create a task', async () => {
    await page.getByPlaceholder('Email').fill(User.email);
    await page.getByPlaceholder('Password').fill(User.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    pauseExecution(2000);
    await page.waitForURL(Routes.DASHBOARD);
    expect(
      await page.getByRole('button', { name: 'Logout' }).textContent(),
    ).toBe('Logout');
    await page.getByRole('button', { name: 'Create Task' }).click();
    await page.getByPlaceholder('Title').fill('Test Task');
    await page.getByPlaceholder('Description').fill('Test Description');
    await page.getByRole('button', { name: 'Create' }).last().click();
    pauseExecution(2000);
    await page.waitForURL(Routes.DASHBOARD);
  });

  test.afterAll(async () => {
    // Clean up the database after all tests are done
    await prisma.invite.deleteMany({
      where: {
        email: User.email,
      },
    });
    await prisma.team.deleteMany({
      where: {
        name: User.teamName,
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: User.email,
      },
    });
    await context.close();
  });
});
