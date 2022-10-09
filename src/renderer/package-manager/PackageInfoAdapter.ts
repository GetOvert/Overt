import { HTMLTemplateResult } from "lit";

export type PackageInfoAdapter<PackageInfo> = {
  packageName(packageInfo: PackageInfo): string;
  packageIdentifier(packageInfo: PackageInfo): string;
  packageDescription(packageInfo: PackageInfo): string;
  isPackageInstalled(packageInfo: PackageInfo): boolean;
  isPackageOutdated(packageInfo: PackageInfo): boolean;
  isPackageDeprecated(packageInfo: PackageInfo): boolean;
  isPackageDisabled(packageInfo: PackageInfo): boolean;

  packageDetails(packageInfo: PackageInfo): PackageDetailField[];
};

export type PackageDetailField = {
  heading: string;
  value?: PackageDetailFieldValue;

  valuesArePackageNames?: boolean;
};
export type PackageDetailFieldValue =
  | undefined
  | null
  | string
  | HTMLTemplateResult
  | PackageDetailFieldValue[]
  | { [fieldLabel: string]: PackageDetailFieldValue };
