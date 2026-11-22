import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
function run(cmd: string, args: string[], cwd = root) {
  const r = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (r.status !== 0)
    throw new Error(
      `${cmd} failed; install Node24+, PHP8.4+ and Composer2 first.`,
    );
}
try {
  run("php", [
    "-r",
    "if (PHP_VERSION_ID < 80400) {fwrite(STDERR, 'PHP 8.4+ is required.'); exit(1);} foreach (['pdo_sqlite','mbstring','fileinfo','zip','curl','dom','gd'] as $ext) {if (!extension_loaded($ext)) {fwrite(STDERR, 'Missing PHP extension: '.$ext);exit(1);}}",
  ]);
  const backend = path.join(root, "apps/backend");
  run("composer", ["install", "--no-interaction", "--prefer-dist"], backend);
  if (!fs.existsSync(path.join(backend, ".env")))
    fs.copyFileSync(
      path.join(backend, ".env.example"),
      path.join(backend, ".env"),
    );
  if (!fs.existsSync(path.join(backend, "database/database.sqlite")))
    fs.writeFileSync(path.join(backend, "database/database.sqlite"), "");
  const env = fs.readFileSync(path.join(backend, ".env"), "utf8");
  if (!/^APP_KEY=base64:.+/m.test(env))
    run("php", ["artisan", "key:generate", "--force"], backend);
  run("php", ["artisan", "migrate", "--force"], backend);
  fs.mkdirSync(".nova", { recursive: true });
  console.log(
    "\nSetup complete. Run npm run dev, then open http://127.0.0.1:5173.\nFor rendering, install Google Chrome locally or set NOVA_CHROME_PATH. Remotion can also download its compatible browser on first render.",
  );
} catch (e) {
  console.error((e as Error).message);
  process.exitCode = 1;
}
