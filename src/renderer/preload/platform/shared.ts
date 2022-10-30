import { spawn } from "child_process";

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
