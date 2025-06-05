import { defineConfig, devices } from "@playwright/test";

const allProjects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
  },
];

// Skip webkit in CI due to timing issues
const projects = process.env.CI
  ? allProjects.filter((project) => project.name !== "webkit")
  : allProjects;

export default defineConfig({
  testDir: "./tests/",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:8000",
    trace: "on-first-retry",
  },
  projects,
});
