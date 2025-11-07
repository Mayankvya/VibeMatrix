import fs from "fs";
import path from "path";
import os from "os";

const filePath = path.join(os.homedir(), ".vibematrix.json");

export function loadMoods() {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

export function saveMood(mood) {
  const data = loadMoods();
  data.push({ ...mood, date: new Date().toISOString() });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function getMoodStats() {
  const data = loadMoods();
  if (!data.length) return null;

  const count = {};
  data.forEach((m) => (count[m.emoji] = (count[m.emoji] || 0) + 1));
  const mostUsed = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return { total: data.length, mostUsed, data };
}
