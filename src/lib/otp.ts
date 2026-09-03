import { randomInt } from "crypto";

/**
 * A 6-digit one-time code from a cryptographically secure RNG.
 *
 * `Math.random()` is NOT safe here — V8's PRNG state can be recovered from a
 * few observed outputs, which would let an attacker predict someone else's
 * login / password-reset code. `crypto.randomInt` is unbiased and unpredictable.
 */
export function generateOTP(): string {
  return String(randomInt(100000, 1000000));
}
