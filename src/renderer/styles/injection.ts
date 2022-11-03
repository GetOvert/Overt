import Color from "color";
import { config } from "shared/config";

export const injectColors = async () => {
  const [useSystemAccentColor, tintDarkBackgrounds] = await Promise.all([
    window.settings.get("useSystemAccentColor"),
    window.settings.get("tintDarkBackgrounds"),
  ]);

  const systemAccentColor = new Color(window.theme.getAccentColor());
  const fallbackAccentColor = new Color(`#${config.fallbackAccentColor}`);

  const accentColor = useSystemAccentColor
    ? systemAccentColor
    : fallbackAccentColor;
  const accentColorDark = accentColor.darken(0.2);
  const accentColorDarker = accentColor.darken(0.26);
  const accentColorDarkBgTint = tintDarkBackgrounds
    ? accentColor.darken(0.9)
    : fallbackAccentColor.grayscale().darken(0.8);

  [
    ["--accent-color", accentColor],
    ["--accent-color-dark", accentColorDark],
    ["--accent-color-darker", accentColorDarker],
    ["--accent-color-dark-bg-tint", accentColorDarkBgTint],
  ].forEach(([name, color]: [string, Color]) => {
    document.documentElement.style.setProperty(name, color.string());
    document.documentElement.style.setProperty(
      `${name}-rgb`,
      `${color.red()}, ${color.green()}, ${color.blue()}`
    );
  });
};

injectColors();
window.settings.onChange(
  ["useSystemAccentColor", "tintDarkBackgrounds"],
  injectColors
);
