export type AccountLegalAcceptance = {
  acceptedAt: string | null;
  acceptedVersion: string | null;
  acceptedVia: "email_password" | "google" | null;
  privacyPolicyAcceptedAt: string | null;
  privacyPolicyPath: string | null;
  termsOfServiceAcceptedAt: string | null;
  termsOfServicePath: string | null;
};

export type AccountProfile = {
  authProviders: string[];
  createdAt: string | null;
  displayName: string | null;
  email: string | null;
  firstName: string | null;
  lastLoginAt: string | null;
  lastName: string | null;
  legal: AccountLegalAcceptance | null;
  photoURL: string | null;
  uid: string;
  updatedAt: string | null;
};

export function buildDisplayName(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.trim() ?? ""} ${lastName?.trim() ?? ""}`.trim();
}

