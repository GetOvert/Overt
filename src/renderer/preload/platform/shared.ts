import { spawn } from "child_process";
import settings from "preload/shared/settings";

export async function runBackgroundProcess(
  executable: string,
  args: string[]
): Promise<string> {
  const process = spawn(executable, args);

  let stdout = "";
  let stderr = "";
  process.stdout.on("data", (data) => {
    stdout += data;
  });
  process.stderr.on("data", (data) => {
    console.error(`stderr: ${data}`);
    stderr += data;
  });

  return new Promise((resolve, reject) => {
    process.on("exit", async (code) => {
      if (code !== 0) return reject(stderr);

      resolve(stdout);
    });
    process.on("error", reject);
  });
}

export async function getFullIndexIntervalInSeconds(): Promise<number> {
  return (
    60 * // seconds/minute
    60 * // minutes/hour
    24 * // hours/day
    (await settings.get("fullIndexIntervalDays"))
  );
}
