import { setEmailBindingForTesting } from "@/lib/email/send";

type Binding = NonNullable<Parameters<typeof setEmailBindingForTesting>[0]>;

export type SentEmail = Parameters<Binding["send"]>[0];

/**
 * Stand in for the Cloudflare send_email binding and record every send, so a
 * test can assert on what the site tried to email without anything leaving
 * the machine. With `fail`, every send throws the way Cloudflare does when it
 * refuses a message.
 *
 * Pair with `afterEach(() => setEmailBindingForTesting(undefined))` so the
 * next test starts with no binding again.
 */
export function fakeEmailBinding(options: { fail?: boolean } = {}) {
  const sent: SentEmail[] = [];

  setEmailBindingForTesting({
    async send(message) {
      if (options.fail) {
        throw Object.assign(new Error("Daily limit reached"), {
          code: "E_DAILY_LIMIT_EXCEEDED",
        });
      }
      sent.push(message);
      return { messageId: `msg-${sent.length}` };
    },
  });

  return sent;
}
