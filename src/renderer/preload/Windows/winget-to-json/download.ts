import fs from "fs";
import path from "path";
import os from "os";
import fetch from "node-fetch";
import StreamZip from "node-stream-zip";

export async function downloadWingetManifests(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdtemp(
      path.join(os.tmpdir(), "winget-to-json"),
      async (err, tmpdir) => {
        if (err) return reject(err);

        const response = await fetch(url, {
          headers: {
            "Content-Type": "application/zip",
          },
        });
        if (!response.ok) {
          console.error(response);
          return reject(
            new Error(`Could not download winget manifests at ${url}`)
          );
        }

        const archiveFile = fs.createWriteStream(
          path.join(tmpdir, "archive.zip")
        );
        // For some reason, attempting to use a pipe here fails.
        response.body.pipe(archiveFile);

        archiveFile.on("finish", async () => {
          archiveFile.close();
          const archive = new StreamZip.async({
            file: archiveFile.path as string,
          });

          const extractedDir = path.join(tmpdir, "unarchived");
          fs.mkdirSync(extractedDir);
          await archive.extract(null, extractedDir);
          await archive.close();

          resolve(path.join(extractedDir, fs.readdirSync(extractedDir)[0]));
        });
      }
    );
  });
}
