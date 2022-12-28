export type Config = {
  sendNativeNotifications: boolean;
  validateCodeSignatures: boolean;

  useSystemAccentColor: boolean;
  tintDarkBackgrounds: boolean;

  fullIndexIntervalDays: number;

  autoUpdateSelf: boolean;
  showSetupOnNextLaunch: boolean;
  indexOnNextLaunch: boolean;
} & PackageManagersConfig;

export type PackageManagersConfig = {
  // macOS
  homebrewPath?: string;

  // Windows
  scoopPath?: string;
};

export const config = {
  fallbackAccentColor: "46b04aff",

  lightTextOnAccentColor: "f8f5f0",
  darkTextOnAccentColor: "232421",
};
