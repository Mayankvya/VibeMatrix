import fs from "fs";
import path from "path";
import os from "os";

const filePath = path.join(os.homedir(), ".vibematrix.json");
const schedulePath = path.join(os.homedir(), ".vibematrix-schedule.json");

/**
 * Load all logged moods from local storage.
 * Returns an array of mood objects.
 */
export function loadMoods() {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath, "utf8");
    if (!data) return [];
    return JSON.parse(data);
  } catch (err) {
    console.error("⚠️ Failed to read mood data:", err.message);
    return [];
  }
}

/**
 * Save a single mood entry (adds to JSON file).
 */
export function saveMood(mood) {
  const data = loadMoods();
  data.push({
    ...mood,
    date: new Date().toISOString(),
  });

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Failed to save mood:", err.message);
  }
}

/**
 * Get statistics (total logs, most frequent mood, etc.)
 */
export function getMoodStats() {
  const data = loadMoods();
  if (!data.length) return null;

  const count = {};
  data.forEach((m) => {
    count[m.emoji] = (count[m.emoji] || 0) + 1;
  });

  const mostUsed = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return { total: data.length, mostUsed, data };
}

/**
 * Get latest N mood logs (for history)
 */
export function getHistory(n = 10) {
  const data = loadMoods();
  if (!data.length) return [];
  const sorted = data
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted.slice(0, n);
}

/**
 * Get dashboard analytics (summary, streaks, energy score)
 */
export function getDashboardData() {
  const data = loadMoods();
  if (!data.length) return null;

  const total = data.length;
  const last = data[data.length - 1];

  // Frequency
  const freq = {};
  data.forEach((m) => (freq[m.name] = (freq[m.name] || 0) + 1));
  const mostUsed = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];

  // Energy score (base values per emoji)
  const energyMap = {
    "😎": 9,
    "🤖": 8,
    "😂": 7,
    "😴": 4,
    "😡": 3,
  };
  const scores = data.map((m) => energyMap[m.emoji] || 5);
  const avgEnergy = (
    scores.reduce((a, b) => a + b, 0) / scores.length
  ).toFixed(1);

  // Daily streak calculation
  const dates = Array.from(
    new Set(data.map((m) => new Date(m.date).toISOString().split("T")[0]))
  ).sort();
  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) streak++;
    else break;
  }

  return {
    total,
    mostUsed,
    last,
    avgEnergy,
    streak,
  };
}

/**
 * Get current streak info (for streak command)
 */
export function getStreakInfo() {
  const data = loadMoods();
  if (!data.length) return null;

  // Get unique dates (one per day)
  const dates = Array.from(
    new Set(data.map((m) => new Date(m.date).toISOString().split("T")[0]))
  ).sort();

  let streak = 1;
  for (let i = dates.length - 1; i > 0; i--) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff <= 1.5) streak++;
    else break;
  }

  // Determine badge
  let badge = "🐣 New Viber";
  if (streak >= 3 && streak < 7) badge = "💪 Mood Consistent";
  else if (streak >= 7 && streak < 14) badge = "🔥 Flow Master";
  else if (streak >= 14) badge = "👑 Zen Coder";

  return { streak, badge, goal: 14 };
}

/**
 * === 🕒 Custom Scheduler Storage ===
 * Handles saving/loading/canceling user mood reminder schedules
 */
export function saveSchedule(config) {
  try {
    fs.writeFileSync(schedulePath, JSON.stringify(config, null, 2), "utf8");
  } catch (err) {
    console.error("❌ Failed to save schedule:", err.message);
  }
}

export function loadSchedule() {
  try {
    if (!fs.existsSync(schedulePath)) return null;
    const data = fs.readFileSync(schedulePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("⚠️ Failed to read schedule:", err.message);
    return null;
  }
}

export function clearSchedule() {
  try {
    if (fs.existsSync(schedulePath)) fs.unlinkSync(schedulePath);
  } catch (err) {
    console.error("⚠️ Failed to clear schedule:", err.message);
  }
}

// Export the storage file paths (for debugging or tests)
export const storageFilePath = filePath;
export const scheduleFilePath = schedulePath;
