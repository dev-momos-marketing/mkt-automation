// Flags motion and brand values that bypass src/brand/theme.ts.
// Run: npm run lint:motion
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const srcDir = join(root, "src");
const allowed = new Set([join(srcDir, "brand", "theme.ts")]);

const rules = [
  { re: /#[0-9a-fA-F]{3,8}\b/, msg: "hard-coded hex colour; use color.* from theme.ts" },
  { re: /Easing\.(bezier|spring)\(/, msg: "inline easing; use ease.* from theme.ts" },
  { re: /\bspring\(\s*\{/, msg: "spring() call; use ease.settle / ease.premium via interpolate()" },
  { re: /cubic-bezier\(/, msg: "CSS cubic-bezier; use ease.* from theme.ts" },
  { re: /\b(transition|animation)\s*:/, msg: "CSS transition/animation does not render in Remotion" },
  { re: /scale\(0\)|\[0,\s*1\]\s*,\s*\{[^}]*\}\)\s*,?\s*\/\/\s*scale/, msg: "scale from 0; start at 0.90-0.97" },
  { re: /Math\.random\(|Date\.now\(|new Date\(/, msg: "non-deterministic value; use random(seed) from remotion" },
  { re: /setTimeout|setInterval|requestAnimationFrame/, msg: "timer; drive everything from useCurrentFrame()" },
  { re: /will-change|willChange/, msg: "will-change blurs text under camera scale" },
  { re: /fontFamily:\s*["'](?!Poppins)/, msg: "font outside the brand; use fontFamily from brand/fonts" },
];

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(p);
  }
};
walk(srcDir);

let problems = 0;
for (const file of files) {
  if (allowed.has(file)) continue;
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("lint-motion-ignore")) return;
    for (const { re, msg } of rules) {
      if (re.test(line)) {
        problems++;
        console.log(`${relative(root, file)}:${i + 1}  ${msg}\n    ${line.trim()}`);
      }
    }
  });
}

if (problems > 0) {
  console.log(`\n${problems} motion lint problem(s). Add "// lint-motion-ignore: <reason>" to a line only with a reason.`);
  process.exit(1);
}
console.log(`motion lint: ${files.length} files clean`);
