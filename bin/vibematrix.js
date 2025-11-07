#!/usr/bin/env node

import inquirer from "inquirer";
import chalk from "chalk";
import { execSync } from "child_process";
import { setTimeout as delay } from "timers/promises";

import { moods } from "../lib/moods.js";
import { quotes } from "../lib/quotes.js";
import { renderChart } from "../lib/chart.js";
import { saveMood, getMoodStats } from "../lib/storage.js";

// 🧩 ASCII Header
function showBanner() {
  console.clear();
  console.log(chalk.cyanBright(`
██╗   ██╗██╗██████╗ ███████╗███╗   ███╗ ███╗   ███╗ █████╗ ████████╗██████╗ ██╗██╗  ██╗
██║   ██║██║██╔══██╗██╔════╝████╗ ████║ ████╗ ████║██╔══██╗╚══██╔══╝██╔══██╗██║╚██╗██╔╝
██║   ██║██║██║  ██║█████╗  ██╔████╔██║ ██╔████╔██║███████║   ██║   ██████╔╝██║ ╚███╔╝ 
╚██╗ ██╔╝██║██║  ██║██╔══╝  ██║╚██╔╝██║ ██║╚██╔╝██║██╔══██║   ██║   ██╔═══╝ ██║ ██╔██╗ 
 ╚████╔╝ ██║██████╔╝███████╗██║ ╚═╝ ██║ ██║ ╚═╝ ██║██║  ██║   ██║   ██║     ██║██╔╝ ██╗
  ╚═══╝  ╚═╝╚═════╝ ╚══════╝╚═╝     ╚═╝ ╚═╝     ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝
  `));
  console.log(chalk.gray("💫 Welcome to VibeMatrix — decode your daily dev energy.\n"));
}

// === Core Mood Logger ===
async function logMood() {
  showBanner();
  const { selected } = await inquirer.prompt([
    { type: "list", name: "selected", message: chalk.cyan("Your vibe today?"), choices: moods.map(m => m.name) }
  ]);

  const mood = moods.find(m => m.name === selected);
  saveMood(mood);
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  console.log(chalk.greenBright(`\n${mood.emoji} Logged: ${mood.name.split(" ")[1]}`));
  console.log(chalk.yellow(mood.message));
  console.log(chalk.blueBright(`💬 ${quote}\n`));
}

// === Mood Stats ===
function showStats() {
  showBanner();
  const stats = getMoodStats();
  if (!stats) return console.log(chalk.red("No vibes logged yet 😢"));
  renderChart(stats.data);
  const [emoji, count] = stats.mostUsed;
  console.log(chalk.cyan(`\nTotal: ${stats.total} | Top Vibe: ${emoji} (${count})`));
}

// === Git Commit Mood Tracker ===
async function gitMood() {
  showBanner();
  await logMood();
  try {
    const commitMsg = execSync("git log -1 --pretty=%B").toString().trim();
    console.log(chalk.gray(`\nLast commit: "${commitMsg}"`));
  } catch {
    console.log(chalk.red("⚠️ Not a Git repo."));
  }
}

// === Reminder (one-time delay) ===
async function remindMood(timeArg = "1h") {
  showBanner();
  const match = timeArg.match(/(\d+)([smh])/);
  if (!match) return console.log(chalk.red("❌ Use format: vibematrix remind 2h or 30m"));

  const [, n, u] = match;
  const ms = u === "h" ? n * 3600000 : u === "m" ? n * 60000 : n * 1000;

  console.log(chalk.yellow(`⏰ Reminder set! I'll check your vibe in ${n}${u}...`));
  await delay(ms);
  console.log(chalk.greenBright("\n🔔 Time's up! Let's log your mood again:\n"));
  await logMood();
}

// === Loop Mode (continuous reminders) ===
async function loopMood(timeArg = "1m") {
  const match = timeArg.match(/(\d+)([smh])/);
  if (!match) return console.log(chalk.red("❌ Format: vibematrix loop 5m or 1h"));

  const [, n, u] = match;
  const ms = u === "h" ? n * 3600000 : u === "m" ? n * 60000 : n * 1000;

  while (true) {
    await logMood();
    console.log(chalk.gray(`⏳ Next vibe check in ${n}${u}...`));
    console.log(chalk.greenBright(`
╔══════════════════════════════╗
║  ⚡ VibeMatrix is running...  ║
║  Press CTRL+C to exit         ║
╚══════════════════════════════╝
`));
    await delay(ms);
  }
}

// === Command Router ===
const args = process.argv.slice(2);
const cmd = args[0];

if (cmd === "stats") showStats();
else if (cmd === "git") await gitMood();
else if (cmd === "remind") await remindMood(args[1] || "1h");
else if (cmd === "loop") await loopMood(args[1] || "1m");
else await logMood();
