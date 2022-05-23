// Originally written by @bdbch on GitHub.
// https://github.com/bdbch/winget-json
// Thank you!

import fs from "fs";
import path from "path";
import yaml from "yaml";

function getManifestContent(path: string) {
  const content = fs.readFileSync(path, "utf8");
  return yaml.parse(content);
}

function readManifest(path: string, moniker: string): any {
  try {
    let jsonContent = getManifestContent(path + `/${moniker}.yaml`);

    if (fs.existsSync(path + `/${moniker}.installer.yaml`)) {
      const installerContent = getManifestContent(
        path + `/${moniker}.installer.yaml`
      );
      jsonContent = { ...jsonContent, ...installerContent };
    }

    if (fs.existsSync(path + `/${moniker}.locale.en-US.yaml`)) {
      const localeContent = getManifestContent(
        path + `/${moniker}.locale.en-US.yaml`
      );
      jsonContent = { ...jsonContent, ...localeContent };
    }

    return jsonContent;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function readParentManifest(path: string, moniker: string): any {
  const manifest = readManifest(path, moniker);
  return { ...manifest, versions: [] };
}

export function extractWingetManifests(repoPath: string): any[] {
  let allPackages: any[] = [];

  const manifestFolders = fs.readdirSync(path.join(repoPath, "manifests"));

  manifestFolders.forEach((folder) => {
    const publishers = fs.readdirSync(path.join(repoPath, "manifests", folder));

    publishers.forEach((publisher) => {
      const packages = fs.readdirSync(
        path.join(repoPath, "manifests", folder, publisher)
      );

      packages.forEach((package_) => {
        const versions = fs.readdirSync(
          path.join(repoPath, "manifests", folder, publisher, package_)
        );

        // read manifest of latest version
        const lastVersion = versions[versions.length - 1];
        const manifest = readParentManifest(
          path.join(
            repoPath,
            "manifests",
            folder,
            publisher,
            package_,
            lastVersion
          ),
          `${publisher}.${package_}`
        );

        // The following code parses version manifests for older versions.
        // We don't care about older versions at the moment, so may as well
        // skip this processing to gain some speed.

        // if (manifest) {
        //   versions.forEach((version) => {
        //     const versionManifest = readManifest(
        //       path.join(
        //         repoPath,
        //         "manifests",
        //         folder,
        //         publisher,
        //         package_,
        //         version
        //       ),
        //       `${publisher}.${package_}`
        //     );

        //     manifest.versions.push(versionManifest);
        //   });

        //   allPackages.push(manifest);
        // }
      });
    });
  });

  return allPackages;
}
