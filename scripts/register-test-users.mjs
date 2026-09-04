#!/usr/bin/env node

import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_URL = "https://dgh-everytime-cefe5.web.app/";
const DEFAULT_IMAGE_PATH = "C:\\Users\\user\\Downloads\\IMG_0019.jpeg";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function usage() {
  console.log(`
Create sequential test registration requests in the DGH Everytime web app.

Usage:
  npm run register:test-users -- [options]

Options:
  --images <path>       Image/file directory (default: ${DEFAULT_IMAGE_PATH})
  --count <number>      Requests to create (default: 10)
  --start <number>      First sequential credential number (default: 1)
  --interval <seconds>  Delay between requests (default: 5)
  --prefix <text>       Username/name prefix (default: qa_student_)
  --email-domain <text> Test email domain (default: example.test)
  --password <text>     Base password (default: Qa!Everytime2026-)
  --url <url>           App URL (default: ${DEFAULT_URL})
  --headed              Show the browser window
  --dry-run             Fill each form but do not submit it
  --help                Show this help

Example:
  npm run register:test-users -- --images ./credential-images --count 5 --headed
`);
}

function parseArgs(argv) {
  const options = {
    url: DEFAULT_URL,
    images: DEFAULT_IMAGE_PATH,
    count: 10,
    start: 1,
    interval: 5,
    prefix: "qa_student_",
    emailDomain: "example.test",
    password: "Qa!Everytime2026-",
    headed: false,
    dryRun: false
  };

  const valueOptions = new Map([
    ["--images", "images"],
    ["--count", "count"],
    ["--start", "start"],
    ["--interval", "interval"],
    ["--prefix", "prefix"],
    ["--email-domain", "emailDomain"],
    ["--password", "password"],
    ["--url", "url"]
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--help") options.help = true;
    else if (argument === "--headed") options.headed = true;
    else if (argument === "--dry-run") options.dryRun = true;
    else if (valueOptions.has(argument)) {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value.`);
      options[valueOptions.get(argument)] = value;
      index += 1;
    } else {
      throw new Error(`Unknown option: ${argument}`);
    }
  }

  options.start = Number(options.start);
  options.count = Number(options.count);
  options.interval = Number(options.interval);
  if (!Number.isSafeInteger(options.start) || options.start < 0) throw new Error("--start must be a non-negative integer.");
  if (!Number.isSafeInteger(options.count) || options.count < 1 || options.count > 100) {
    throw new Error("--count must be an integer from 1 through 100.");
  }
  if (!Number.isFinite(options.interval) || options.interval < 0 || options.interval > 3600) {
    throw new Error("--interval must be between 0 and 3600 seconds.");
  }
  if (!options.emailDomain.includes(".")) throw new Error("--email-domain must be a valid domain-like value.");
  return options;
}

async function findImages(inputPath) {
  const resolved = path.resolve(inputPath);
  const details = await stat(resolved);
  const candidates = details.isDirectory()
    ? (await readdir(resolved)).map((name) => path.join(resolved, name))
    : [resolved];
  const images = candidates
    .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  if (!images.length) throw new Error(`No JPG, PNG, or WebP images found at ${resolved}.`);
  return images;
}

function sequence(value, width = 4) {
  return String(value).padStart(width, "0");
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function firstVisible(page, candidates, description) {
  for (const candidate of candidates) {
    const locator = candidate().first();
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  throw new Error(`Could not find ${description}. Run with --headed and update its locator for the current app UI.`);
}

async function openRegistration(page, appUrl) {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });
  const trigger = await firstVisible(page, [
    () => page.getByRole("link", { name: /회원가입|가입하기|sign\s*up/i }),
    () => page.getByRole("button", { name: /회원가입|가입하기|sign\s*up/i }),
    () => page.getByText(/회원가입|가입하기|sign\s*up/i, { exact: true })
  ], "the 회원가입 trigger");
  await trigger.click();
}

async function fillByMeaning(page, patterns, value, description) {
  const field = await firstVisible(page, [
    () => page.getByLabel(patterns),
    () => page.getByPlaceholder(patterns),
    () => page.locator(`input[name*="${description}" i]`)
  ], description);
  await field.fill(value);
}

async function fillRegistration(page, credentials, imagePath) {
  await fillByMeaning(page, /아이디|사용자명|username|user id|login id/i, credentials.username, "username");

  const emailField = await firstVisible(page, [
    () => page.getByLabel(/이메일|email/i),
    () => page.getByPlaceholder(/이메일|email/i),
    () => page.locator('input[type="email"]')
  ], "email");
  await emailField.fill(credentials.email);

  const passwordFields = page.locator('input[type="password"]');
  const passwordCount = await passwordFields.count();
  if (!passwordCount) throw new Error("Could not find a password field.");
  await passwordFields.nth(0).fill(credentials.password);
  if (passwordCount > 1) await passwordFields.nth(1).fill(credentials.password);

  const nameField = await firstVisible(page, [
    () => page.getByLabel(/^(이름|성명|name)$/i),
    () => page.getByPlaceholder(/^(이름|성명|name)(을 입력하세요)?$/i),
    () => page.locator('input[name*="name" i]')
  ], "name");
  await nameField.fill(credentials.name);

  const fileInput = page.locator('input[type="file"]').first();
  if (!await fileInput.count()) throw new Error("Could not find the credentials image file input.");
  await fileInput.setInputFiles(imagePath);
}

async function submitRegistration(page) {
  const submit = await firstVisible(page, [
    () => page.getByRole("button", { name: /가입 요청|등록 요청|회원가입|가입하기|신청|submit|register/i }),
    () => page.locator('button[type="submit"]'),
    () => page.locator('input[type="submit"]')
  ], "the registration request button");
  await submit.click();
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(500);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    usage();
    return;
  }
  const images = await findImages(options.images);
  const count = options.count;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: !options.headed });
  const results = [];

  try {
    for (let offset = 0; offset < count; offset += 1) {
      const number = options.start + offset;
      const suffix = sequence(number);
      const credentials = {
        username: `${options.prefix}${suffix}`,
        name: `QA 학생 ${suffix}`,
        email: `${options.prefix}${suffix}@${options.emailDomain}`,
        password: `${options.password}${suffix}`
      };
      const image = images[offset % images.length];
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await openRegistration(page, options.url);
        await fillRegistration(page, credentials, image);
        if (!options.dryRun) await submitRegistration(page);
        results.push({ ...credentials, password: "[redacted]", image, status: options.dryRun ? "filled" : "submitted" });
        console.log(`[${offset + 1}/${count}] ${credentials.username}: ${options.dryRun ? "filled (dry run)" : "submitted"}`);
      } catch (error) {
        const screenshot = path.resolve(`registration-error-${suffix}.png`);
        await page.screenshot({ path: screenshot, fullPage: true }).catch(() => {});
        results.push({ ...credentials, password: "[redacted]", image, status: "failed", error: error.message, screenshot });
        console.error(`[${offset + 1}/${count}] ${credentials.username}: failed — ${error.message}`);
      } finally {
        await context.close();
      }
      if (offset < count - 1 && options.interval > 0) {
        console.log(`Waiting ${options.interval} seconds before the next request…`);
        await delay(options.interval * 1000);
      }
    }
  } finally {
    await browser.close();
    await writeFile("registration-results.json", `${JSON.stringify(results, null, 2)}\n`);
  }

  if (results.some((result) => result.status === "failed")) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`Registration runner error: ${error.message}`);
  process.exitCode = 1;
});
