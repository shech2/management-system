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
  });

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    await page.goto(baseURL + Routes.AUTH);
    page.on('console', (msg) => console.log('console log:', msg.text()));
    page.on('pageerror', (err: Error) => console.trace('PAGEERROR', err));
    page.on('dialog', async (dialog) => {
      console.log(dialog.message());
      await dialog.dismiss();
    });
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
    const invite = await prisma.invite.create({
      data: {
        email: User.email,
        teamId: team.id,
        role: User.Role,
      },
    });
    expect(user).toBeTruthy();
    expect(team).toBeTruthy();
    expect(invite).toBeTruthy();
  });

  test('check users in db', async () => {
    const users = await prisma.user.findMany();
    expect(users.length).toBeGreaterThan(0);
  });

  test('login test', async () => {
    // Expect a title "to contain" a substring.
    await page.getByPlaceholder('Email').fill(User.email);
    await page.getByPlaceholder('Password').fill(User.password);
    await page.getByRole('button', { name: 'Log in' }).click();
    pauseExecution(2000);
    page.waitForURL(Routes.DASHBOARD);
    expect(
      await page.getByRole('button', { name: 'Logout' }).textContent(),
    ).toBe('Logout');
  });
});
