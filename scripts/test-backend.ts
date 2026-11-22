import { spawnSync } from "node:child_process";
const result = spawnSync("php", ["artisan", "test"], {
  cwd: "apps/backend",
  stdio: "inherit",
  shell: false,
});
process.exitCode = result.status ?? 1;
