import { Routes, baseURL, User } from '@/consts';
import { test, expect, BrowserContext, Page } from '@playwright/test';
import prisma from '../../lib/prismadb';
import bcrypt from 'bcrypt';
import { Provider } from '@prisma/client';
import { pauseExecution } from '@/utils/axios';

test.describe('Authentication tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.afterAll(async () => {
    // delete test user
    await prisma.user.deleteMany({
      where: {
        email: User.email,
      },
    });
  });

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto('http://127.0.0.1' + Routes.AUTH);
    page.on('console', (msg) => console.log('console log:', msg.text()));
    page.on('pageerror', (err: Error) => console.trace('PAGEERROR', err));
  });

  test('load auth page', async () => {
    await page.goto(baseURL + Routes.AUTH);
    expect(page.url()).toBe(baseURL + Routes.AUTH);
    expect(await page.title()).toBe('Management System');
  });

  test('create static user in db', async () => {
    const passwordHash = bcrypt.hashSync(User.password, 10);
    const user = await prisma.user.create({
      data: {
        email: User.email,
        fullName: User.name,
        passwordHash: passwordHash,
        lastLogin: new Date(),
        role: User.Role,
        provider: Provider.EMAIL,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        passwordHash: true,
        lastLogin: true,
        teamId: true,
        role: true,
      },
    });
    const team = await prisma.team.create({
      data: {
        name: User.teamName,
        users: {
          connect: {
            id: user.id,
          },
        },
      },
    });
    expect(user).toBeTruthy();
    expect(team).toBeTruthy();
  });

  test('check users in db', async () => {
    const users = await prisma.user.findMany();
    console.log('users:', users);
    expect(users).toBeTruthy();
  });

  test('login test', async () => {
    // Expect a title "to contain" a substring.
    await page.getByPlaceholder('Email').fill(User.email);
    await page.getByPlaceholder('Password').fill(User.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    pauseExecution(5000);
    await page.waitForURL(Routes.DASHBOARD);
    expect(page.url()).toBe(baseURL + Routes.DASHBOARD);
    expect(
      await page.getByRole('button', { name: 'Logout' }).textContent(),
    ).toBe('Logout');
  });
});
