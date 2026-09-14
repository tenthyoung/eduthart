"use client";

import {
  BadgeCheck,
  LogOut,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

import { AccountPanel, BusyLabel } from "@/components/account/account-surfaces";
import {
  ChangeEmailDialog,
  type EmailFormData,
  type useEmailForm,
} from "@/components/account/change-email-dialog";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function VerificationState({ verified }: { verified: boolean }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/35 p-4 text-sm text-foreground">
      {verified ? (
        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" />
      ) : (
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <div>
        <p className="font-medium">
          {verified
            ? "Your email is verified."
            : "Your email still needs verification."}
        </p>
        <p className="text-muted-foreground">
          {verified
            ? "This address has already been confirmed for your EduthArt account."
            : "Verify your inbox link, then refresh the status here."}
        </p>
      </div>
    </div>
  );
}

export function SecuritySection({
  currentEmail,
  emailForm,
  hasPasswordProvider,
  isEmailDialogOpen,
  isEmailVerified,
  onChangePassword,
  onEmailDialogChange,
  onEmailSubmit,
  onPasswordReset,
  onRefreshVerification,
  onSendVerificationEmail,
  onSignOut,
  providerLabel,
  refreshingVerification,
  resettingPassword,
  sendingVerification,
  signingOut,
}: {
  currentEmail: string | null;
  emailForm: ReturnType<typeof useEmailForm>;
  hasPasswordProvider: boolean;
  isEmailDialogOpen: boolean;
  isEmailVerified: boolean;
  onChangePassword: (current: string, next: string) => Promise<void>;
  onEmailDialogChange: (open: boolean) => void;
  onEmailSubmit: (values: EmailFormData) => Promise<void>;
  onPasswordReset: () => void;
  onRefreshVerification: () => void;
  onSendVerificationEmail: () => void;
  onSignOut: () => void;
  providerLabel: string;
  refreshingVerification: boolean;
  resettingPassword: boolean;
  sendingVerification: boolean;
  signingOut: boolean;
}) {
  return (
    <AccountPanel className="space-y-4" icon={ShieldCheck} title="Security">
      <ChangeEmailDialog
        currentEmail={currentEmail}
        form={emailForm}
        onOpenChange={onEmailDialogChange}
        onSubmit={onEmailSubmit}
        open={isEmailDialogOpen}
      />

      <VerificationState verified={isEmailVerified} />

      {!isEmailVerified ? (
        <div className="flex flex-col gap-3">
          <Button
            disabled={sendingVerification}
            onClick={onSendVerificationEmail}
            type="button"
            variant="outline"
          >
            <BusyLabel
              busy={sendingVerification}
              busyLabel="Sending verification email..."
            >
              <Mail />
              Send verification email
            </BusyLabel>
          </Button>
          <Button
            disabled={refreshingVerification}
            onClick={onRefreshVerification}
            type="button"
            variant="outline"
          >
            <BusyLabel
              busy={refreshingVerification}
              busyLabel="Refreshing verification status..."
            >
              <RefreshCw />
              Refresh verification status
            </BusyLabel>
          </Button>
        </div>
      ) : null}

      {hasPasswordProvider ? (
        <div className="flex flex-col gap-3">
          <ChangePasswordDialog onSubmit={onChangePassword} />
          <Button
            disabled={resettingPassword}
            onClick={onPasswordReset}
            type="button"
            variant="outline"
          >
            <BusyLabel
              busy={resettingPassword}
              busyLabel="Sending reset link..."
            >
              <Mail />
              Send password reset email
            </BusyLabel>
          </Button>
        </div>
      ) : (
        <Alert>
          <AlertTitle>Password reset is not available here</AlertTitle>
          <AlertDescription>
            This account signs in with {providerLabel}, so there is no EduthArt
            password to change or reset.
          </AlertDescription>
        </Alert>
      )}

      <div className="border-t border-border/70 pt-4">
        <Button
          className="w-full"
          disabled={signingOut}
          onClick={onSignOut}
          type="button"
          variant="outline"
        >
          <BusyLabel busy={signingOut} busyLabel="Signing out...">
            <LogOut />
            Sign out
          </BusyLabel>
        </Button>
      </div>
    </AccountPanel>
  );
}
