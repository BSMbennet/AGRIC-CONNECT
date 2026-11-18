"""Security helper tests for the Render Stripe test-mode adapter."""
import hashlib
import hmac
import time
import unittest

import main


class TestRenderStripeSecurity(unittest.TestCase):
    def test_test_mode_key_guard_accepts_only_test_keys(self):
        self.assertTrue(main._is_test_stripe_key("sk_test_example"))
        self.assertTrue(main._is_test_stripe_key("rk_test_example"))
        self.assertFalse(main._is_test_stripe_key("sk_live_example"))
        self.assertFalse(main._is_test_stripe_key("rk_live_example"))
        self.assertFalse(main._is_test_stripe_key(""))
        self.assertFalse(main._is_test_stripe_key("not-a-key"))

    def test_signature_verification_accepts_valid_recent_signature(self):
        payload = b'{"id":"evt_test","livemode":false}'
        secret = "whsec_test_example"
        timestamp = str(int(time.time()))
        digest = hmac.new(secret.encode(), timestamp.encode() + b"." + payload, hashlib.sha256).hexdigest()
        self.assertTrue(main._verify_stripe_signature(payload, "t=" + timestamp + ",v1=" + digest, secret))

    def test_signature_verification_rejects_stale_and_invalid_signatures(self):
        payload = b'{"id":"evt_test","livemode":false}'
        secret = "whsec_test_example"
        timestamp = str(int(time.time()) - 600)
        digest = hmac.new(secret.encode(), timestamp.encode() + b"." + payload, hashlib.sha256).hexdigest()
        self.assertFalse(main._verify_stripe_signature(payload, "t=" + timestamp + ",v1=" + digest, secret))
        current = str(int(time.time()))
        self.assertFalse(main._verify_stripe_signature(payload, "t=" + current + ",v1=" + ("0" * 64), secret))

    def test_integration_identifier_is_eight_letters_and_stable_with_seed(self):
        value = main._integration_identifier("order", "stable-payment-attempt-id")
        suffix = value.rsplit("-", 1)[-1]
        self.assertEqual(len(suffix), 8)
        self.assertTrue(suffix.isalpha())
        self.assertEqual(value, main._integration_identifier("order", "stable-payment-attempt-id"))
        self.assertNotEqual(value, main._integration_identifier("order", "different-payment-attempt-id"))


if __name__ == "__main__":
    unittest.main()
