# Copyright 2017, Inderpreet Singh, All rights reserved.

import unittest
from unittest.mock import MagicMock, patch
import time

from controller.sonarr_manager import SonarrManager


class TestSonarrManager(unittest.TestCase):
    """Unit tests for SonarrManager."""

    def setUp(self):
        self.mock_context = MagicMock()
        self.mock_context.logger = MagicMock()
        self.mock_context.config.sonarr.enabled = True
        self.mock_context.config.sonarr.sonarr_url = "http://localhost:8989"
        self.mock_context.config.sonarr.sonarr_api_key = "test-api-key"
        self.manager = SonarrManager(context=self.mock_context)
        self.model_file_names = {"File.A", "File.B", "File.C"}

    def _make_record(self, title, state="downloading"):
        return {"title": title, "trackedDownloadState": state}

    def _make_response(self, records):
        """Create a mock response with the given records."""
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"records": records}
        return mock_resp

    def _advance_poll_time(self):
        """Simulate 61 seconds passing since last poll."""
        self.manager._SonarrManager__last_poll_time = time.time() - 61

    @patch('controller.sonarr_manager.requests')
    def test_disabled_returns_empty(self, mock_requests):
        self.mock_context.config.sonarr.enabled = False
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)
        mock_requests.get.assert_not_called()

    @patch('controller.sonarr_manager.requests')
    def test_poll_interval_skips_when_not_elapsed(self, mock_requests):
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A")
        ])
        # First call - should poll (bootstrap)
        self.manager.process(self.model_file_names)
        self.assertEqual(1, mock_requests.get.call_count)

        # Second call immediately - should skip (interval not elapsed)
        result = self.manager.process(self.model_file_names)
        self.assertEqual(1, mock_requests.get.call_count)  # not called again
        self.assertEqual([], result)

    @patch('controller.sonarr_manager.requests')
    def test_poll_interval_polls_when_elapsed(self, mock_requests):
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A")
        ])
        # First call - bootstrap
        self.manager.process(self.model_file_names)
        self.assertEqual(1, mock_requests.get.call_count)

        # Advance time past interval
        self._advance_poll_time()

        # Second call - should poll again
        self.manager.process(self.model_file_names)
        self.assertEqual(2, mock_requests.get.call_count)

    @patch('controller.sonarr_manager.requests')
    def test_first_poll_bootstrap_no_detections(self, mock_requests):
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A"),
            self._make_record("File.B"),
        ])
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)

    @patch('controller.sonarr_manager.requests')
    def test_detect_import_via_disappearance(self, mock_requests):
        # First poll: File.A and File.B in queue (bootstrap)
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A"),
            self._make_record("File.B"),
        ])
        self.manager.process(self.model_file_names)

        # Advance time
        self._advance_poll_time()

        # Second poll: only File.B (File.A disappeared)
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.B"),
        ])
        result = self.manager.process(self.model_file_names)
        self.assertEqual(["File.A"], result)

    @patch('controller.sonarr_manager.requests')
    def test_detect_import_via_state_change(self, mock_requests):
        # First poll: File.A in importPending state
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A", "importPending"),
        ])
        self.manager.process(self.model_file_names)

        self._advance_poll_time()

        # Second poll: File.A transitioned to imported
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A", "imported"),
        ])
        result = self.manager.process(self.model_file_names)
        self.assertEqual(["File.A"], result)

    @patch('controller.sonarr_manager.requests')
    def test_detect_import_via_both_signals(self, mock_requests):
        # First poll: File.A importPending, File.B downloading
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A", "importPending"),
            self._make_record("File.B", "downloading"),
        ])
        self.manager.process(self.model_file_names)

        self._advance_poll_time()

        # Second poll: File.A state changed to imported, File.B disappeared
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A", "imported"),
        ])
        result = self.manager.process(self.model_file_names)
        self.assertIn("File.A", result)
        self.assertIn("File.B", result)
        self.assertEqual(2, len(result))

    @patch('controller.sonarr_manager.requests')
    def test_network_error_returns_empty_no_state_update(self, mock_requests):
        import requests as real_requests

        # First poll: successful bootstrap
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A"),
            self._make_record("File.B"),
        ])
        mock_requests.RequestException = real_requests.RequestException
        self.manager.process(self.model_file_names)

        self._advance_poll_time()

        # Second poll: network error
        mock_requests.get.side_effect = real_requests.RequestException("connection refused")
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)

        self._advance_poll_time()

        # Third poll: successful, File.A gone
        mock_requests.get.side_effect = None
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.B"),
        ])
        result = self.manager.process(self.model_file_names)
        # Should still detect File.A disappearance because state wasn't updated on error
        self.assertEqual(["File.A"], result)

    @patch('controller.sonarr_manager.requests')
    def test_non_200_status_returns_empty(self, mock_requests):
        mock_resp = MagicMock()
        mock_resp.status_code = 500
        mock_requests.get.return_value = mock_resp
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)

    @patch('controller.sonarr_manager.requests')
    def test_filter_to_seedsync_files_only(self, mock_requests):
        # First poll: File.A, File.B, External.File
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A"),
            self._make_record("File.B"),
            self._make_record("External.File"),
        ])
        self.manager.process(self.model_file_names)

        self._advance_poll_time()

        # Second poll: only External.File remains
        mock_requests.get.return_value = self._make_response([
            self._make_record("External.File"),
        ])
        result = self.manager.process(self.model_file_names)
        # Only SeedSync-managed files should be returned
        self.assertIn("File.A", result)
        self.assertIn("File.B", result)
        self.assertEqual(2, len(result))

    @patch('controller.sonarr_manager.requests')
    def test_unmatched_disappearance_logged_at_debug(self, mock_requests):
        # First poll: File.A and Unknown.File
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A"),
            self._make_record("Unknown.File"),
        ])
        self.manager.process(self.model_file_names)

        self._advance_poll_time()

        # Second poll: Unknown.File disappeared
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A"),
        ])
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)
        # Verify debug log about unmatched disappearance
        self.manager.logger.debug.assert_any_call(
            "Sonarr queue item 'Unknown.File' disappeared but not in SeedSync model"
        )

    @patch('controller.sonarr_manager.requests')
    def test_case_insensitive_name_matching(self, mock_requests):
        # First poll: lowercase version of file name
        mock_requests.get.return_value = self._make_response([
            self._make_record("file.a"),
        ])
        # Model has "File.A" (different case)
        model_files = {"File.A"}
        self.manager.process(model_files)

        self._advance_poll_time()

        # Second poll: file.a disappeared
        mock_requests.get.return_value = self._make_response([])
        result = self.manager.process(model_files)
        # Should return the ORIGINAL model file name, not the Sonarr name
        self.assertEqual(["File.A"], result)

    @patch('controller.sonarr_manager.requests')
    def test_api_call_params(self, mock_requests):
        mock_requests.get.return_value = self._make_response([])
        self.manager.process(self.model_file_names)

        mock_requests.get.assert_called_once_with(
            "http://localhost:8989/api/v3/queue",
            headers={"X-Api-Key": "test-api-key"},
            params={"pageSize": 200, "includeUnknownSeriesItems": True},
            timeout=10
        )

    @patch('controller.sonarr_manager.requests')
    def test_url_trailing_slash_stripped(self, mock_requests):
        self.mock_context.config.sonarr.sonarr_url = "http://localhost:8989/"
        mock_requests.get.return_value = self._make_response([])
        self.manager.process(self.model_file_names)

        # URL should NOT have double slash
        call_args = mock_requests.get.call_args
        self.assertEqual("http://localhost:8989/api/v3/queue", call_args[0][0])

    @patch('controller.sonarr_manager.requests')
    def test_already_imported_state_not_redetected(self, mock_requests):
        # First poll: File.A already in imported state (bootstrap)
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A", "imported"),
        ])
        self.manager.process(self.model_file_names)

        self._advance_poll_time()

        # Second poll: File.A still in imported state (no change)
        mock_requests.get.return_value = self._make_response([
            self._make_record("File.A", "imported"),
        ])
        result = self.manager.process(self.model_file_names)
        # No new detection -- state didn't change between polls
        self.assertEqual([], result)
