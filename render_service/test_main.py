"""Unit tests for security and stable idempotency helpers in the Render adapter."""
import hashlib
import hmac
import time
import unittest

import main


class TestStripeTestMode(unittest.TestCase):
    def test_accepts_only_test_secret_key_prefixes(self):
        self.assertTrue(main.is_test_secret_key("sk_test_example"))
        self.assertTrue(main.is_test_secret_key("rk_test_example"))
        self.assertFalse(main.is_test_secret_key("sk_live_example"))
        self.assertFalse(main.is_test_secret_key("rk_live_example"))
        self.assertFalse(main.is_test_secret_key(""))
        self.assertFalse(main.is_test_secret_key("not-a-key"))

    def test_signature_verification_accepts_valid_recent_signature(self):
        previous = main.STRIPE_WEBHOOK_SECRET
        try:
            main.STRIPE_WEBHOOK_SECRET = "whsec_test_example"
            payload = b'{"id":"evt_test","livemode":false}'
            timestamp = str(int(time.time()))
            digest = hmac.new(
                main.STRIPE_WEBHOOK_SECRET.encode("utf-8"),
                timestamp.encode("ascii") + b"." + payload,
                hashlib.sha256,
            ).hexdigest()
            self.assertTrue(main.stripe_signature_valid(
                payload, "t=" + timestamp + ",v1=" + digest
            ))
        finally:
            main.STRIPE_WEBHOOK_SECRET = previous

    def test_signature_verification_rejects_invalid_and_stale_signatures(self):
        previous = main.STRIPE_WEBHOOK_SECRET
        try:
            main.STRIPE_WEBHOOK_SECRET = "whsec_test_example"
            payload = b'{"id":"evt_test","livemode":false}'
            timestamp = str(int(time.time()) - 600)
            digest = hmac.new(
                main.STRIPE_WEBHOOK_SECRET.encode("utf-8"),
                timestamp.encode("ascii") + b"." + payload,
                hashlib.sha256,
            ).hexdigest()
            self.assertFalse(main.stripe_signature_valid(
                payload, "t=" + timestamp + ",v1=" + digest
            ))
            self.assertFalse(main.stripe_signature_valid(
                payload, "t=" + str(int(time.time())) + ",v1=" + ("0" * 64)
            ))
        finally:
            main.STRIPE_WEBHOOK_SECRET = previous

    def test_integration_identifier_suffix_is_stable_eight_letters(self):
        suffix = main.deterministic_letters("stable-payment-attempt-id")
        self.assertEqual(len(suffix), 8)
        self.assertTrue(suffix.isalpha())
        self.assertEqual(suffix, main.deterministic_letters("stable-payment-attempt-id"))
        self.assertNotEqual(suffix, main.deterministic_letters("different-payment-attempt-id"))


if __name__ == "__main__":
    unittest.main()
