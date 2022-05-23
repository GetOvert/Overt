import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import StreamZip from "node-stream-zip";

export async function downloadWingetManifests(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.mkdtemp(path.join(os.tmpdir(), "winget-to-json"), (err, tmpdir) => {
      if (err) return reject(err);

      http.get(url, async (response) => {
        if (response.statusCode !== 200) {
          return reject(
            new Error(`Could not download winget manifests at ${url}`)
          );
        }

        const archiveFile = fs.createWriteStream(
          path.join(tmpdir, "archive.zip")
        );
        response.pipe(archiveFile);

        archiveFile.on("finish", async () => {
          archiveFile.close();
          const archive = new StreamZip.async({
            file: archiveFile.path as string,
          });

          const extractedDir = path.join(tmpdir, "unarchived");
          fs.mkdirSync(extractedDir);
          await archive.extract(".", extractedDir);
          await archive.close();

          resolve(extractedDir);
        });
      });
    });
  });
}
