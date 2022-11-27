module.exports = {
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "GetOvert",
          name: "Overt",
        },
      },
    },
  ],

  // https://electron.github.io/electron-packager/main/interfaces/electronpackager.options.html
  packagerConfig: {
    icon: "./icons/overt-app-icon",
    appBundleId: "app.getovert.Overt",
    appCategoryType: "public.app-category.utilities",
    appCopyright: "© 2022 Overt Contributors",
    osxSign: process.env.CODESIGN_IDENTITY
      ? {
          // Name of certificate to sign with
          identity: process.env.CODESIGN_IDENTITY,

          "hardened-runtime": true,
          // Silence false positive warning message
          "gatekeeper-assess": false,
          entitlements: "entitlements.plist",
          "entitlements-inherit": "entitlements.plist",
          "signature-flags": "library",
        }
      : undefined,
    osxNotarize: process.env.NOTARIZE_APPLE_ID
      ? {
          // Email address of Apple ID
          appleId: process.env.NOTARIZE_APPLE_ID,

          // App-specific password for the Apple ID, or a reference like "@keychain:AC_PASSWORD"
          // (https://github.com/electron/electron-notarize#safety-when-using-appleidpassword)
          appleIdPassword: process.env.NOTARIZE_PASSWORD,
        }
      : undefined,
    protocols: [
      {
        name: "Overt",
        schemes: ["overt"],
      },
    ],
  },
  makers: [
    {
      name: "@electron-forge/maker-squirrel",
      config: {
        name: "overt",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {
        mimeType: ["x-scheme-handler/overt"],
      },
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  plugins: [
    [
      "@electron-forge/plugin-webpack",
      {
        devContentSecurityPolicy:
          "default-src 'self' 'unsafe-inline' data: https://fonts.googleapis.com https://fonts.gstatic.com https://formulae.brew.sh https://storage.googleapis.com/storage.getovert.app/ https://storage.cloud.google.com/storage.getovert.app/; script-src 'self' 'unsafe-eval' 'unsafe-inline' data:; img-src 'self' data: https://storage.googleapis.com/storage.getovert.app/",
        mainConfig: "./webpack.main.config.js",
        renderer: {
          config: "./webpack.renderer.config.js",
          entryPoints: [
            {
              html: "index.html",
              js: "renderer.ts",
              name: "main_window",
              preload: {
                js: "preload/preload.ts",
              },
            },
          ],
        },
      },
    ],
  ],
};
