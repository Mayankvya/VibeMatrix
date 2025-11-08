#!/usr/bin/env node

import inquirer from "inquirer";
import { execSync } from "child_process";
import { setTimeout as delay } from "timers/promises";
import { green, yellow, red, cyan, magenta, blue, gray } from "colorette";
import notifier from "node-notifier";

import { moods } from "../lib/moods.js";
import { quotes } from "../lib/quotes.js";
import { renderChart } from "../lib/chart.js";
import { saveMood, getMoodStats } from "../lib/st.js";
import {
  getDashboardData,
  getStreakInfo,
  saveSchedule,
  clearSchedule,
  getHistory,
} from "../lib/storage.js";

// 💫 ASCII Banner
function showBanner() {
  console.clear();
  console.log(cyan("⚡ VibeMatrix — Track, Decode & Elevate Your Mood ⚡"));
  console.log(gray("💫 Decode your daily dev energy.\n"));
}

// === Mood Logger ===
async function logMood() {
  showBanner();

  const { selected } = await inquirer.prompt([
    {
      type: "list",
      name: "selected",
      message: cyan("Your vibe today?"),
      choices: moods.map((m) => m.name),
    },
  ]);

  if (new Date().getHours() === 9) await moodOfTheDay();

  const mood = moods.find((m) => m.name === selected);
  saveMood(mood);

  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  console.log(green(`\n${mood.emoji} Logged: ${mood.name.split(" ")[1]}`));
  console.log(yellow(mood.message));
  console.log(blue(`💬 ${quote}\n`));
}

// === Stats ===
function showStats() {
  showBanner();
  const stats = getMoodStats();
  if (!stats) return console.log(red("No vibes logged yet 😢"));

  renderChart(stats.data);
  const [emoji, count] = stats.mostUsed;
  console.log(cyan(`\nTotal: ${stats.total} | Top Vibe: ${emoji} (${count})`));
}

// === Git Mood Tracker ===
async function gitMood() {
  showBanner();
  await logMood();
  try {
    const commitMsg = execSync("git log -1 --pretty=%B").toString().trim();
    console.log(gray(`\nLast commit: "${commitMsg}"`));
  } catch {
    console.log(red("⚠️ Not a Git repo."));
  }
}

// === Reminder (One-time) ===
async function remindMood(timeArg = "1h") {
  showBanner();
  const match = timeArg.match(/(\d+)([smh])/);
  if (!match) return console.log(red("❌ Use format: vibematrix remind 2h or 30m"));

  const [, n, u] = match;
  const ms = u === "h" ? n * 3600000 : u === "m" ? n * 60000 : n * 1000;

  console.log(yellow(`⏰ Reminder set! I'll check your vibe in ${n}${u}...`));
  await delay(ms);
  console.log(green("\n🔔 Time's up! Let's log your mood again:\n"));
  await logMood();
}

// === Loop Mode ===
async function loopMood(timeArg = "1m") {
  const match = timeArg.match(/(\d+)([smh])/);
  if (!match) return console.log(red("❌ Format: vibematrix loop 5m or 1h"));

  const [, n, u] = match;
  const ms = u === "h" ? n * 3600000 : u === "m" ? n * 60000 : n * 1000;

  while (true) {
    await logMood();
    console.log(gray(`⏳ Next vibe check in ${n}${u}...`));
    console.log(green(`
╔══════════════════════════════╗
║  ⚡ VibeMatrix is running...  ║
║  Press CTRL+C to exit         ║
╚══════════════════════════════╝
`));
    await delay(ms);
  }
}

// === Dashboard (v2 with Energy Trend) ===
function showDashboard() {
  showBanner();
  const stats = getDashboardData();
  if (!stats) return console.log(red("No mood data found. Start logging first!"));

  const [moodName, moodCount] = stats.mostUsed;
  const energy = parseFloat(stats.avgEnergy);
  const color = energy >= 8 ? green : energy >= 5 ? yellow : red;
  const filled = "⚡".repeat(Math.round(energy));
  const empty = "·".repeat(10 - Math.round(energy));
  const bar = color(`${filled}${empty}`);

  console.log(cyan("\n💫 VibeMatrix Dashboard"));
  console.log(gray("───────────────────────────────"));
  console.log(green(`📅 Total Logs: ${stats.total}`));
  console.log(yellow(`🔥 Current Streak: ${stats.streak} days`));
  console.log(blue(`😎 Most Frequent Mood: ${moodName} (${moodCount})`));
  console.log(magenta(`⚡ Average Energy: ${energy}/10`));
  console.log(color(`🔋 Energy Meter: ${bar}`));
  console.log(cyan(`🧘 Last Mood: ${stats.last.emoji} ${stats.last.name} (${new Date(stats.last.date).toLocaleString()})`));
  console.log(gray("───────────────────────────────"));
  showEnergyTrend();
  console.log(gray("───────────────────────────────\n"));

  if (energy >= 8) console.log(green("🌟 You’re on fire today! Keep up the amazing energy!"));
  else if (energy >= 5) console.log(yellow("💪 You’re doing great — stay consistent!"));
  else console.log(red("🧘 Take a short break. You’ve earned it."));
}

// === Energy Trend Graph (Dashboard 2.0) ===
function showEnergyTrend() {
  const stats = getDashboardData();
  if (!stats || !stats.data) return;

  const data = stats.data.slice(-10);
  const energyMap = { "😎": 9, "🤖": 8, "😂": 7, "😴": 4, "😡": 3 };

  console.log(cyan("\n⚡ Energy Trend (Last 10 Moods)"));
  console.log(gray("──────────────────────────────"));

  data.forEach((m) => {
    const energy = energyMap[m.emoji] || 5;
    const filled = "⚡".repeat(Math.round(energy / 2));
    console.log(`${m.emoji} ${m.name.padEnd(18)} ${green(filled)}`);
  });
}

// === Streak Tracker ===
function showStreak() {
  showBanner();
  const info = getStreakInfo();
  if (!info) return console.log(red("No mood logs yet 😢 Start with `vibematrix` first!"));

  const { streak, badge, goal } = info;
  const percent = Math.min((streak / goal) * 100, 100);
  const bar = "▓".repeat(Math.round(percent / 5)).padEnd(20, "▒");

  console.log(cyan("\n🔥 Vibe Streak Tracker"));
  console.log(gray("──────────────────────────────"));
  console.log(green(`📆 Current Streak: ${streak} days`));
  console.log(yellow(`🏆 Badge Earned: ${badge}`));
  console.log(magenta(`${bar} ${percent.toFixed(0)}%`));
  console.log(gray("──────────────────────────────"));
  console.log(blue("⚡ Keep it up! You’re building serious consistency 💪\n"));
}

// === Mood History Timeline ===
function randomColor(str) {
  const colors = [cyan, green, yellow, magenta, blue, red];
  return colors[Math.floor(Math.random() * colors.length)](str);
}

function confetti() {
  const particles = ["✨", "💫", "🌈", "🎊", "🎉", "⭐", "🌟"];
  let output = "";
  for (let i = 0; i < 50; i++) {
    output += randomColor(particles[Math.floor(Math.random() * particles.length)]);
  }
  console.log("\n" + output + "\n");
}

function showHistory() {
  showBanner();
  const moods = getHistory(10);
  if (!moods.length) return console.log(red("No moods logged yet 😢"));

  console.log(cyan("\n📜 Mood History Timeline"));
  console.log(gray("──────────────────────────────"));
  moods.forEach((m) => {
    const date = new Date(m.date).toLocaleString();
    console.log(`${randomColor("●")} ${m.emoji} ${m.name} — ${gray(date)}`);
  });
  console.log(gray("──────────────────────────────"));
  console.log(yellow("✨ Keep tracking — your vibes tell a story!"));
  confetti();
}

// === Mood of the Day ===
async function moodOfTheDay() {
  showBanner();

  const mood = moods[Math.floor(Math.random() * moods.length)];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  const msg = `${mood.emoji} ${mood.name.split(" ")[1]} — ${mood.message}`;
  const dailyQuote = `💬 ${quote}`;
  saveMood({ ...mood, tag: "auto" });

  notifier.notify({
    title: "🌞 VibeMatrix — Mood of the Day",
    message: `${msg}\n${quote}`,
    timeout: 10,
  });

  console.log(cyan("\n🌞 Mood of the Day"));
  console.log(gray("────────────────────────────"));
  console.log(green(`${msg}`));
  console.log(yellow(dailyQuote));
  console.log(gray("────────────────────────────"));
  console.log(blue("✨ Take this energy into your day! 💫\n"));
}
// === Custom Scheduler (Auto Reminders) ===
async function scheduleMood(timeArg = "daily 9am") {
  showBanner();

  if (timeArg === "cancel") {
    clearSchedule();
    console.log(red("🛑 Schedule cleared. No future reminders set."));
    return;
  }

  const [type, time] = timeArg.split(" ");
  saveSchedule({ type, time, created: new Date().toISOString() });

  console.log(green(`✅ Schedule saved!`));
  console.log(cyan(`You’ll be reminded to log your mood ${type} at ${time}.`));
  console.log(gray("──────────────────────────────"));

  // Convert type → interval
  const interval =
    type === "hourly" ? 3600000 :
    type === "daily" ? 86400000 :
    type === "weekly" ? 604800000 : 3600000;

  while (true) {
    await delay(interval);
    console.log(gray(`\n⏰ Scheduled check (${type} @ ${time})`));
    await logMood();
  }
}

// debug-vm.js
import path from "path";
import os from "os";
import fs from "fs";

const root = process.cwd();
console.log("cwd:", root);
console.log("node:", process.version);

const storagePath = path.join(os.homedir(), ".vibematrix.json");
console.log("expected storage:", storagePath);
console.log("storage exists:", fs.existsSync(storagePath));

try {
  const st = await import(path.join(root, "lib", "storage.js"));
  console.log("storage exports:", Object.keys(st));
  if (st.getDashboardData) {
    const d = st.getDashboardData();
    console.log("getDashboardData() =>", d ? { total: d.total, streak: d.streak } : "null");
  }
} catch (err) {
  console.error("storage import err:", err.stack || err.message || err);
}

try {
  const st2 = await import(path.join(root, "lib", "st.js"));
  console.log("st.js exports:", Object.keys(st2));
  if (st2.getMoodStats) console.log("getMoodStats() =>", st2.getMoodStats());
} catch (err) {
  console.error("st.js import err:", err.stack || err.message || err);
}

// === Command Router ===
const args = process.argv.slice(2);
const cmd = args[0];

const commands = {
  stats: showStats,
  dashboard: showDashboard,
  streak: showStreak,
  history: showHistory,
  git: gitMood,
  remind: remindMood,
  loop: loopMood,
  schedule: scheduleMood,
  mood: moodOfTheDay,
  help: () => {
    showBanner();
    console.log(yellow("\n⚙️  Commands: stats | dashboard | streak | history | remind | loop | git | schedule | mood | help"));
    console.log(gray("────────────────────────────────────────────"));
    console.log(blue("💡 Tip: Run 'vibematrix' with no args to log your mood.\n"));
  },
};

if (!cmd) await logMood();
else if (commands[cmd]) await commands[cmd](args[1]);
else console.log(red(`❌ Unknown command '${cmd}'. Try 'vibematrix help'.`));
