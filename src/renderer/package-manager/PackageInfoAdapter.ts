import { HTMLTemplateResult } from "lit";

export type PackageInfoAdapter<PackageInfo> = {
  packageName(packageInfo: PackageInfo): string;
  packageIdentifier(packageInfo: PackageInfo): string;
  packageDescription(packageInfo: PackageInfo): string;
  packageWebsiteURL(packageInfo: PackageInfo): string | undefined;
  packageIconURL(packageInfo: PackageInfo): string | undefined;
  packagePublisher(packageInfo: PackageInfo): string | undefined;
  packageLastUpdated(packageInfo: PackageInfo): number | undefined;

  isPackageInstalled(packageInfo: PackageInfo): boolean;
  isPackageOutdated(packageInfo: PackageInfo): boolean;
  isPackageDeprecated(packageInfo: PackageInfo): boolean;
  isPackageDisabled(packageInfo: PackageInfo): boolean;
  isPackageOvert(packageInfo: PackageInfo): boolean;

  packageDetails(packageInfo: PackageInfo): PackageDetailField[][];
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
