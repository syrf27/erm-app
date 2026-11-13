const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

// cPanel's Node.js Selector may run npm lifecycle scripts from its virtual
// environment directory instead of the application directory. Resolve the
// project root first so Prisma always receives an absolute schema path.
const candidateRoots = [
  process.env.INIT_CWD,
  process.env.npm_config_local_prefix,
  process.cwd(),
  path.resolve(__dirname, ".."),
].filter(Boolean);

const projectRoot = candidateRoots.find((root) =>
  fs.existsSync(path.join(root, "prisma", "schema.prisma")),
);

if (!projectRoot) {
  console.error("Prisma schema tidak ditemukan. Pastikan folder prisma ikut dideploy.");
  process.exit(1);
}

const prismaBin = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "prisma.cmd" : "prisma",
);
const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
const result = spawnSync(prismaBin, ["generate", "--schema", schemaPath], {
  cwd: projectRoot,
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
