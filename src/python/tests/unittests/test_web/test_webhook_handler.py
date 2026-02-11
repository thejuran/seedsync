# Copyright 2017, Inderpreet Singh, All rights reserved.

import unittest
from unittest.mock import MagicMock, patch

from web.handler.webhook import WebhookHandler


class TestWebhookHandlerExtractSonarrTitle(unittest.TestCase):
    """Tests for _extract_sonarr_title static method."""

    def test_extracts_source_path_basename(self):
        body = {"episodeFile": {"sourcePath": "/downloads/Game.of.Thrones.S01E01-GROUP"}}
        result = WebhookHandler._extract_sonarr_title(body)
        self.assertEqual("Game.of.Thrones.S01E01-GROUP", result)

    def test_falls_back_to_release_title(self):
        body = {"release": {"releaseTitle": "Game.of.Thrones.S01E01-GROUP"}}
        result = WebhookHandler._extract_sonarr_title(body)
        self.assertEqual("Game.of.Thrones.S01E01-GROUP", result)

    def test_falls_back_to_series_title(self):
        body = {"series": {"title": "Game of Thrones"}}
        result = WebhookHandler._extract_sonarr_title(body)
        self.assertEqual("Game of Thrones", result)

    def test_prefers_source_path_over_release_title(self):
        body = {
            "episodeFile": {"sourcePath": "/downloads/FromSourcePath"},
            "release": {"releaseTitle": "FromRelease"}
        }
        result = WebhookHandler._extract_sonarr_title(body)
        self.assertEqual("FromSourcePath", result)

    def test_empty_body_returns_empty(self):
        result = WebhookHandler._extract_sonarr_title({})
        self.assertEqual("", result)


class TestWebhookHandlerExtractRadarrTitle(unittest.TestCase):
    """Tests for _extract_radarr_title static method."""

    def test_extracts_source_path_basename(self):
        body = {"movieFile": {"sourcePath": "/downloads/Inception.2010.1080p-GROUP"}}
        result = WebhookHandler._extract_radarr_title(body)
        self.assertEqual("Inception.2010.1080p-GROUP", result)

    def test_falls_back_to_release_title(self):
        body = {"release": {"releaseTitle": "Inception.2010.1080p-GROUP"}}
        result = WebhookHandler._extract_radarr_title(body)
        self.assertEqual("Inception.2010.1080p-GROUP", result)

    def test_falls_back_to_movie_title(self):
        body = {"movie": {"title": "Inception"}}
        result = WebhookHandler._extract_radarr_title(body)
        self.assertEqual("Inception", result)

    def test_empty_body_returns_empty(self):
        result = WebhookHandler._extract_radarr_title({})
        self.assertEqual("", result)


class TestWebhookHandlerRoutes(unittest.TestCase):
    """Tests for webhook handler routing and event processing."""

    def setUp(self):
        self.mock_webhook_manager = MagicMock()
        self.handler = WebhookHandler(self.mock_webhook_manager)

    @patch('web.handler.webhook.request')
    def test_sonarr_download_event_enqueues(self, mock_request):
        mock_request.json = {
            "eventType": "Download",
            "episodeFile": {"sourcePath": "/downloads/Test.File-GROUP"}
        }
        response = self.handler._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)
        self.assertEqual(200, response.status_code)
        self.mock_webhook_manager.enqueue_import.assert_called_once_with(
            "Sonarr", "Test.File-GROUP"
        )

    @patch('web.handler.webhook.request')
    def test_radarr_download_event_enqueues(self, mock_request):
        mock_request.json = {
            "eventType": "Download",
            "movieFile": {"sourcePath": "/downloads/Movie.2024-GROUP"}
        }
        response = self.handler._handle_webhook("Radarr", WebhookHandler._extract_radarr_title)
        self.assertEqual(200, response.status_code)
        self.mock_webhook_manager.enqueue_import.assert_called_once_with(
            "Radarr", "Movie.2024-GROUP"
        )

    @patch('web.handler.webhook.request')
    def test_test_event_returns_200_test_ok(self, mock_request):
        mock_request.json = {"eventType": "Test"}
        response = self.handler._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)
        self.assertEqual(200, response.status_code)
        self.assertIn("Test OK", response.body)
        self.mock_webhook_manager.enqueue_import.assert_not_called()

    @patch('web.handler.webhook.request')
    def test_grab_event_returns_200_ok(self, mock_request):
        mock_request.json = {"eventType": "Grab"}
        response = self.handler._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)
        self.assertEqual(200, response.status_code)
        self.mock_webhook_manager.enqueue_import.assert_not_called()

    @patch('web.handler.webhook.request')
    def test_rename_event_returns_200_ok(self, mock_request):
        mock_request.json = {"eventType": "Rename"}
        response = self.handler._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)
        self.assertEqual(200, response.status_code)
        self.mock_webhook_manager.enqueue_import.assert_not_called()

    @patch('web.handler.webhook.request')
    def test_empty_body_returns_400(self, mock_request):
        mock_request.json = None
        response = self.handler._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)
        self.assertEqual(400, response.status_code)
        self.assertIn("Empty body", response.body)

    @patch('web.handler.webhook.request')
    def test_invalid_json_returns_400(self, mock_request):
        # Make request.json raise an exception when accessed
        type(mock_request).json = property(lambda self: (_ for _ in ()).throw(ValueError("bad json")))
        response = self.handler._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)
        self.assertEqual(400, response.status_code)
        self.assertIn("Invalid JSON", response.body)

    @patch('web.handler.webhook.request')
    def test_download_with_no_title_returns_200_no_enqueue(self, mock_request):
        mock_request.json = {"eventType": "Download"}
        response = self.handler._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)
        self.assertEqual(200, response.status_code)
        self.mock_webhook_manager.enqueue_import.assert_not_called()

    def test_add_routes_registers_both_endpoints(self):
        mock_web_app = MagicMock()
        self.handler.add_routes(mock_web_app)
        calls = mock_web_app.add_post_handler.call_args_list
        paths = [c[0][0] for c in calls]
        self.assertIn("/server/webhook/sonarr", paths)
        self.assertIn("/server/webhook/radarr", paths)
