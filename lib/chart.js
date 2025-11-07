import chalk from "chalk";

export function renderChart(rows, options = {}) {
  const maxBars = options.maxBars || 20;
  const block = options.blockChar || "▓";

  if (!rows || rows.length === 0) {
    console.log(chalk.red("No data to display for chart."));
    return;
  }

  const count = {};
  rows.forEach((r) => (count[r.emoji] = (count[r.emoji] || 0) + 1));
  const entries = Object.entries(count);
  const maxCount = Math.max(...entries.map(([, c]) => c));

  console.log(chalk.magenta("\n🧩 VibeMatrix Chart\n"));
  entries.forEach(([emoji, c]) => {
    const barLength = Math.round((c / maxCount) * maxBars);
    console.log(`${emoji} ${chalk.green(block.repeat(barLength))} ${chalk.gray(`(${c})`)}`);
  });
}
