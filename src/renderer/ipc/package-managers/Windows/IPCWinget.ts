import { html } from "lit";
import {
  PackageDetailField,
  PackageInfoAdapter,
} from "package-manager/PackageInfoAdapter";
import { IPCPackageManager } from "../IPCPackageManager";

declare global {
  interface Window {
    winget: IPCWinget;
  }
}

export type IPCWinget = IPCPackageManager<WingetPackageInfo, "">;

export type WingetPackageInfo = WingetDefaultLocaleManifest & {
  installedVersion?: string;
};

// https://github.com/microsoft/winget-pkgs/blob/master/doc/manifest/schema/1.1.0/defaultLocale.md
type WingetDefaultLocaleManifest = {
  /** The package unique identifier */
  PackageIdentifier: string;
  /** The package version */
  PackageVersion: string;
  /** The package meta-data locale */
  PackageLocale: string;
  /** The publisher name */
  Publisher: string;
  /** Optional publisher home page */
  PublisherURL?: string;
  /** Optional publisher support page */
  PublisherSupportUrl?: string;
  /** Optional publisher privacy page */
  PrivacyUrl?: string;
  /** Optional author */
  Author?: string;
  /** The package name */
  PackageName: string;
  /** Optional package home page */
  PackageURL?: string;
  /** The package license */
  License: string;
  /** Optional package home page */
  LicenseUrl?: string;
  /** Optional package copyright */
  Copyright?: string;
  /** Optional package copyright page */
  CopyrightUrl?: string;
  /** The short package description */
  ShortDescription: string;
  /** Optional full package description */
  Description?: string;
  /** Optional most common package term */
  Moniker?: string;
  /** Optional list of package terms */
  Tags?: string[];
  /** Optional package agreements */
  Agreement?: {
    /** Optional agreement label */
    AgreementLabel?: string;
    /** Optional agreement text */
    Agreement?: string;
    /** Optional agreement URL */
    AgreementUrl?: string;
  }[];
  /** Optional release date */
  ReleaseDate?: string;
  /** Optional release notes */
  ReleaseNotes?: string;
  /** Optional release notes URL */
  ReleaseNotesUrl?: string;
};

export class WingetPackageInfoAdapter
  implements PackageInfoAdapter<WingetPackageInfo>
{
  packageName(packageInfo: WingetPackageInfo): string {
    return packageInfo.PackageName;
  }

  packageIdentifier(packageInfo: WingetPackageInfo): string {
    return packageInfo.PackageIdentifier;
  }

  packageDescription(packageInfo: WingetPackageInfo): string {
    return packageInfo.ShortDescription;
  }

  packageWebsiteURL(packageInfo: WingetPackageInfo): string | undefined {
    return packageInfo.PackageURL;
  }

  packageIconURL(packageInfo: WingetPackageInfo): string | undefined {
    return undefined;
  }

  packagePublisher(packageInfo: WingetPackageInfo): string | undefined {
    return packageInfo.Publisher;
  }

  packageLastUpdated(packageInfo: WingetPackageInfo): number | undefined {
    return undefined;
  }

  isPackageInstalled(packageInfo: WingetPackageInfo): boolean {
    return !!packageInfo.installedVersion?.length;
  }

  isPackageOutdated(packageInfo: WingetPackageInfo): boolean {
    return (
      this.isPackageInstalled(packageInfo) &&
      packageInfo.installedVersion !== packageInfo.PackageVersion
    );
  }

  isPackageDeprecated(packageInfo: WingetPackageInfo): boolean {
    return false;
  }

  isPackageDisabled(packageInfo: WingetPackageInfo): boolean {
    return false;
  }

  isPackageOvert(packageInfo: WingetPackageInfo): boolean {
    return false;
  }

  packageDetails(packageInfo: WingetPackageInfo): PackageDetailField[][] {
    return [
      [
        {
          heading: "Versions",
          value: html`<dl>
            <dt>Installed:</dt>
            <dd>${packageInfo.installedVersion ?? "None"}</dd>
            <dt>Latest:</dt>
            <dd>${packageInfo.PackageVersion}</dd>
          </dl>`,
        },
      ],
    ];
  }
}
