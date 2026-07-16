const [major = 0, minor = 0] = process.versions.node
  .split(".")
  .map((value) => Number.parseInt(value, 10));

const isSupported =
  major > 20 || (major === 20 && minor >= 0) || major === 22 || major === 24;

if (isSupported) {
  process.exit(0);
}

console.error(
  [
    `EduthArt site requires Node 20+.`,
    `Current version: ${process.versions.node}`,
    `Next 15 does not support Node 18.17.0, which can fail with low-level crashes instead of a clean startup error.`,
    `Switch to Node 20+ in /Users/izzyyoung/code/eduthart/site and try again.`,
  ].join("\n"),
);

process.exit(1);
