export type Config = {
  sendNativeNotifications: boolean;
  validateCodeSignatures: boolean;

  useSystemAccentColor: boolean;
  tintDarkBackgrounds: boolean;

  fullIndexIntervalDays: number;

  homebrewPath: string;
};

export const config = {
  fallbackAccentColor: "46b04aff",
};
