# Copyright 2017, Inderpreet Singh, All rights reserved.

import logging
import unittest
from unittest.mock import MagicMock

from webtest import TestApp

from web.web_app import WebApp


def _make_minimal_web_app() -> WebApp:
    """
    Create a minimal WebApp instance suitable for unit testing.

    Sets up a fake context and controller so WebApp can be instantiated
    without real infrastructure.
    """
    mock_context = MagicMock()
    mock_context.logger = logging.getLogger("test_web_app")
    mock_context.args.html_path = "/tmp"
    mock_context.status = MagicMock()

    mock_controller = MagicMock()

    return WebApp(context=mock_context, controller=mock_controller)


class TestWebAppSecurityHeaders(unittest.TestCase):
    """Tests that all API responses include required security headers."""

    def setUp(self):
        self.app = _make_minimal_web_app()
        # Add a simple test endpoint that returns 200
        @self.app.route("/test/ping")
        def _ping():
            return "pong"

        self.client = TestApp(self.app)

    def test_response_has_csp_header(self):
        """Content-Security-Policy header must be present on every response."""
        response = self.client.get("/test/ping")
        self.assertIn("Content-Security-Policy", response.headers)
        csp = response.headers["Content-Security-Policy"]
        self.assertIn("default-src 'self'", csp)

    def test_csp_header_contains_required_directives(self):
        """CSP header must include key directives for a web app."""
        response = self.client.get("/test/ping")
        csp = response.headers["Content-Security-Policy"]
        self.assertIn("script-src", csp)
        self.assertIn("frame-ancestors 'none'", csp)

    def test_response_has_x_frame_options(self):
        """X-Frame-Options: DENY must be present on every response."""
        response = self.client.get("/test/ping")
        self.assertIn("X-Frame-Options", response.headers)
        self.assertEqual("DENY", response.headers["X-Frame-Options"])

    def test_response_has_x_content_type_options(self):
        """X-Content-Type-Options: nosniff must be present on every response."""
        response = self.client.get("/test/ping")
        self.assertIn("X-Content-Type-Options", response.headers)
        self.assertEqual("nosniff", response.headers["X-Content-Type-Options"])

    def test_security_headers_on_second_route(self):
        """Security headers must appear on responses from all routes, not just one."""
        @self.app.route("/test/other")
        def _other():
            return "other"

        client = TestApp(self.app)
        response = client.get("/test/other")
        self.assertIn("Content-Security-Policy", response.headers)
        self.assertIn("X-Frame-Options", response.headers)
        self.assertIn("X-Content-Type-Options", response.headers)

    def test_security_headers_on_post_route(self):
        """Security headers must appear on POST responses too."""
        @self.app.route("/test/post", method="POST")
        def _post():
            return "posted"

        client = TestApp(self.app)
        response = client.post("/test/post")
        self.assertIn("Content-Security-Policy", response.headers)
        self.assertIn("X-Frame-Options", response.headers)
        self.assertIn("X-Content-Type-Options", response.headers)
