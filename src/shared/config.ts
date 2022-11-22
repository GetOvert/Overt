export type Config = {
  sendNativeNotifications: boolean;
  validateCodeSignatures: boolean;

  useSystemAccentColor: boolean;
  tintDarkBackgrounds: boolean;

  fullIndexIntervalDays: number;

  autoUpdateSelf: boolean;
  homebrewPath: string;
};

export const config = {
  fallbackAccentColor: "46b04aff",

  lightTextOnAccentColor: "f8f5f0",
  darkTextOnAccentColor: "232421",
};
