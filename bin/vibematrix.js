#!/usr/bin/env node

import inquirer from "inquirer";
import { execSync } from "child_process";
import { setTimeout as delay } from "timers/promises";
import { green, yellow, red, cyan, magenta, blue, gray } from "colorette";
import notifier from "node-notifier";
import fs from "fs";

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
  getWeeklyEnergyTrend,
  storageFilePath,
  scheduleFilePath,
} from "../lib/storage.js";

// =================== 🧱 SAFETY RECOVERY ===================
function ensureFilesExist() {
  for (const file of [storageFilePath, scheduleFilePath]) {
    try {
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, "[]", "utf8");
      }
    } catch (err) {
      console.error(red(`⚠️ Failed to create ${file}: ${err.message}`));
    }
  }
}
ensureFilesExist();

// =================== 💫 FLAGS ===================
const FAST_MODE = process.argv.includes("--fast");
const SILENT_MODE = process.argv.includes("--silent");

// 💫 ASCII Banner
function showBanner() {
  if (FAST_MODE) return;
  console.clear();
  console.log(cyan("⚡ VibeMatrix — Track, Decode & Elevate Your Mood ⚡"));
  console.log(gray("💫 Decode your daily dev energy.\n"));
}

// =================== MOOD LOGGER ===================
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
  if (!SILENT_MODE) console.log(blue(`💬 ${quote}\n`));
}

// =================== STATS ===================
function showStats() {
  showBanner();
  const stats = getMoodStats();
  if (!stats) return console.log(red("No vibes logged yet 😢"));
  renderChart(stats.data);
  const [emoji, count] = stats.mostUsed;
  console.log(cyan(`\nTotal: ${stats.total} | Top Vibe: ${emoji} (${count})`));
}

// =================== GIT MOOD TRACKER ===================
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

// =================== REMINDER ===================
async function remindMood(timeArg = "1h") {
  showBanner();
  const match = timeArg.match(/(\d+)([smh])/);
  if (!match)
    return console.log(red("❌ Use format: vibematrix remind 2h or 30m"));

  const [, n, u] = match;
  const ms = u === "h" ? n * 3600000 : u === "m" ? n * 60000 : n * 1000;

  console.log(yellow(`⏰ Reminder set! I'll check your vibe in ${n}${u}...`));
  await delay(ms);
  console.log(green("\n🔔 Time's up! Let's log your mood again:\n"));
  await logMood();
}

// =================== LOOP MODE ===================
async function loopMood(timeArg = "1m") {
  const match = timeArg.match(/(\d+)([smh])/);
  if (!match) return console.log(red("❌ Format: vibematrix loop 5m or 1h"));

  const [, n, u] = match;
  const ms = u === "h" ? n * 3600000 : u === "m" ? n * 60000 : n * 1000;

  console.log(gray("Press CTRL+C anytime to exit.\n"));
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

// =================== DASHBOARD ===================
function showDashboard() {
  showBanner();
  const stats = getDashboardData();
  if (!stats || !stats.data || !stats.data.length)
    return console.log(red("No mood data found. Start logging first!"));

  const [moodName, moodCount] = stats.mostUsed;
  const energy = parseFloat(stats.avgEnergy);
  const color = energy >= 8 ? green : energy >= 5 ? yellow : red;
  const filled = "⚡".repeat(Math.round(energy));
  const empty = "·".repeat(10 - Math.round(energy));
  const bar = color(`${filled}${empty}`);

  console.log(cyan("\n💫 VibeMatrix Dashboard"));
  console.log(gray("───────────────────────────────"));
  console.log(green(`📅  Total Logs:        ${stats.total}`));
  console.log(yellow(`🔥  Current Streak:    ${stats.streak} days`));
  console.log(blue(`😎  Top Mood:           ${moodName} (${moodCount})`));
  console.log(magenta(`⚡  Avg Energy:         ${energy}/10`));
  console.log(color(`🔋  Energy Meter:       ${bar}`));
  console.log(
    cyan(
      `🧘  Last Mood:          ${stats.last.emoji} ${stats.last.name} (${new Date(
        stats.last.date
      ).toLocaleString()})`
    )
  );
  console.log(gray("───────────────────────────────\n"));

  showEnergyTrend();
  showWeeklyEnergyTrend();

  if (!SILENT_MODE) {
    if (energy >= 8)
      console.log(green("🌟 You’re on fire today! Keep up the amazing energy!"));
    else if (energy >= 5)
      console.log(yellow("💪 You’re doing great — stay consistent!"));
    else console.log(red("🧘 Take a short break. You’ve earned it."));
  }
}

// =================== ENERGY TREND ===================
function showEnergyTrend() {
  const data = getHistory(10);
  if (!data || !data.length) return;

  const energyMap = { "😎": 9, "🤖": 8, "😂": 7, "😴": 4, "😡": 3 };
  console.log(cyan("\n⚡ Energy Trend (Last 10 Moods)"));
  console.log(gray("──────────────────────────────"));
  data.forEach((m) => {
    const energy = energyMap[m.emoji] || 5;
    const filled = "⚡".repeat(Math.round(energy / 2));
    const energyColor = energy >= 8 ? green : energy >= 5 ? yellow : red;
    console.log(`${m.emoji} ${m.name.padEnd(18)} ${energyColor(filled)}`);
  });
  console.log(gray("──────────────────────────────\n"));
}

// =================== WEEKLY TREND ===================
function showWeeklyEnergyTrend() {
  const trend = getWeeklyEnergyTrend();
  if (!trend.length) return;
  console.log(cyan("\n📆 Weekly Energy Overview"));
  console.log(gray("──────────────────────────────"));
  trend.forEach(({ date, avg }) => {
    const barLength = Math.round((avg / 10) * 20);
    const bar = "█".repeat(barLength).padEnd(20, "░");
    const color = avg >= 8 ? green : avg >= 5 ? yellow : red;
    const day = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
    console.log(`${day.padEnd(4)} ${color(bar)} ${gray(avg.toFixed(1))}`);
  });
  console.log(gray("──────────────────────────────\n"));
}

// =================== STREAK TRACKER ===================
function showStreak() {
  showBanner();
  const info = getStreakInfo();
  if (!info)
    return console.log(red("No mood logs yet 😢 Start with `vibematrix` first!"));

  const { streak, badge, goal } = info;
  const percent = Math.min((streak / goal) * 100, 100);
  const bar = "▓".repeat(Math.round(percent / 5)).padEnd(20, "▒");

  console.log(cyan("\n🔥 Vibe Streak Tracker"));
  console.log(gray("──────────────────────────────"));
  console.log(green(`📆  Current Streak:  ${streak} days`));
  console.log(yellow(`🏆  Badge:           ${badge}`));
  console.log(magenta(`${bar} ${percent.toFixed(0)}%`));
  console.log(gray("──────────────────────────────"));
  if (!SILENT_MODE)
    console.log(blue("⚡ Keep it up! You’re building serious consistency 💪\n"));
}

// =================== HISTORY ===================
function randomColor(str) {
  const colors = [cyan, green, yellow, magenta, blue, red];
  return colors[Math.floor(Math.random() * colors.length)](str);
}

function confetti() {
  if (FAST_MODE) return;
  const particles = ["✨", "💫", "🌈", "🎊", "🎉", "⭐", "🌟"];
  let output = "";
  for (let i = 0; i < 50; i++) {
    output += randomColor(
      particles[Math.floor(Math.random() * particles.length)]
    );
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
  if (!SILENT_MODE) console.log(yellow("✨ Keep tracking — your vibes tell a story!"));
  confetti();
}

// =================== MOOD OF THE DAY ===================
async function moodOfTheDay() {
  showBanner();
  const mood = moods[Math.floor(Math.random() * moods.length)];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];
  const msg = `${mood.emoji} ${mood.name.split(" ")[1]} — ${mood.message}`;
  const dailyQuote = `💬 ${quote}`;
  saveMood({ ...mood, tag: "auto" });
  notifier.notify({ title: "🌞 VibeMatrix — Mood of the Day", message: `${msg}\n${quote}`, timeout: 10 });
  console.log(cyan("\n🌞 Mood of the Day"));
  console.log(gray("────────────────────────────"));
  console.log(green(`${msg}`));
  console.log(yellow(dailyQuote));
  console.log(gray("────────────────────────────"));
  if (!SILENT_MODE) console.log(blue("✨ Take this energy into your day! 💫\n"));
}

// =================== AI MOOD PREDICTION ===================
function predictMoodFromText(text) {
  const lower = text.toLowerCase();
  const map = [
    { keywords: ["fix", "refactor", "clean", "update"], mood: "🤖 Focused" },
    { keywords: ["add", "create", "launch", "feature"], mood: "😎 Productive" },
    { keywords: ["bug", "issue", "fail", "error"], mood: "😡 Frustrated" },
    { keywords: ["fun", "cool", "awesome", "nice"], mood: "😂 Cheerful" },
    { keywords: ["tired", "sleep", "zzz", "break"], mood: "😴 Tired" },
  ];
  for (const { keywords, mood } of map) {
    if (keywords.some((word) => lower.includes(word))) {
      return moods.find((m) => m.name.includes(mood)) || moods[0];
    }
  }
  return moods.find((m) => m.name.includes("Focused")) || moods[0];
}

async function autoMoodPrediction() {
  showBanner();
  let commitMsg = "";
  try {
    commitMsg = execSync("git log -1 --pretty=%B").toString().trim();
    console.log(gray(`\n🧠 Analyzing last commit: "${commitMsg}"...`));
  } catch {
    const { message } = await inquirer.prompt([
      { type: "input", name: "message", message: cyan("💬 Describe what you worked on:") },
    ]);
    commitMsg = message;
  }
  const predictedMood = predictMoodFromText(commitMsg);
  saveMood(predictedMood);
  console.log(green(`\n${predictedMood.emoji} AI predicts: ${predictedMood.name.split(" ")[1]}`));
  console.log(yellow(predictedMood.message));
  if (!SILENT_MODE) console.log(blue("💡 Mood auto-logged based on your activity!\n"));
}

// =================== SCHEDULER ===================
async function scheduleMood(timeArg = "daily 9am") {
  showBanner();
  if (timeArg === "cancel") {
    clearSchedule();
    console.log(red("🛑 Schedule cleared."));
    return;
  }
  const [type, time] = timeArg.split(" ");
  saveSchedule({ type, time, created: new Date().toISOString() });
  console.log(green("✅ Schedule saved!"));
  console.log(cyan(`You’ll be reminded ${type} at ${time}.`));
  console.log(gray("──────────────────────────────"));
  console.log(gray("Press CTRL+C anytime to exit.\n"));
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

// =================== COMMAND ROUTER ===================
const args = process.argv.filter((a) => !["--fast", "--silent"].includes(a));
const cmd = args[2];

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
  auto: autoMoodPrediction,
  help: () => {
    showBanner();
    console.log(yellow("\n⚙️  Commands: stats | dashboard | streak | history | remind | loop | git | schedule | mood | auto | help"));
    console.log(gray("────────────────────────────────────────────"));
    console.log(blue("💡 Tip: Run 'vibematrix' with no args to log your mood.\n"));
  },
};

if (!cmd) await logMood();
else if (commands[cmd]) await commands[cmd](args[3]);
else console.log(red(`❌ Unknown command '${cmd}'. Try 'vibematrix help'.`));
