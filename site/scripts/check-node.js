const [major = 0] = process.versions.node
  .split(".")
  .map((value) => Number.parseInt(value, 10));

if (major >= 24) {
  process.exit(0);
}

console.error(
  [
    `EduthArt site requires Node 24+.`,
    `Current version: ${process.versions.node}`,
    `Production runs Node 24 (see "engines" in package.json); older lines are end-of-life or miss security fixes.`,
    `Switch to Node 24 in /Users/izzyyoung/code/eduthart/site (nvm use 24) and try again.`,
  ].join("\n")
);

process.exit(1);
