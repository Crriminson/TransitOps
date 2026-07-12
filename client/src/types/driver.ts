import type { DriverStatus, Region } from "@transitops/shared";

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiryDate: string;
  contactNumber: string;
  safetyScore: number;
  status: DriverStatus;
  region: Region;
  licenseExpired: boolean;
  createdAt: string;
  updatedAt: string;
}
