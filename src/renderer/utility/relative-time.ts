// https://stackoverflow.com/a/53800501

// in miliseconds
const units = {
  year: 24 * 60 * 60 * 1000 * 365,
  month: (24 * 60 * 60 * 1000 * 365) / 12,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
};

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export const formatRelative = (d1: number, d2 = new Date().getTime()) => {
  var elapsed = d1 - d2;

  // "Math.abs" accounts for both "past" & "future" scenarios
  for (let u in units) {
    const unit = u as keyof typeof units;
    if (Math.abs(elapsed) > units[unit] || unit == "second") {
      return rtf.format(Math.round(elapsed / units[unit]), unit);
    }
  }
};
