# Copyright 2017, Inderpreet Singh, All rights reserved.

import unittest
from unittest.mock import MagicMock

from controller.webhook_manager import WebhookManager


class TestWebhookManager(unittest.TestCase):
    """Unit tests for WebhookManager."""

    def setUp(self):
        self.mock_context = MagicMock()
        self.mock_context.logger = MagicMock()
        self.manager = WebhookManager(context=self.mock_context)
        self.model_file_names = {"File.A", "File.B", "File.C"}

    def test_process_empty_queue_returns_empty(self):
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)

    def test_enqueue_and_process_matching_file(self):
        self.manager.enqueue_import("Sonarr", "File.A")
        result = self.manager.process(self.model_file_names)
        self.assertEqual(["File.A"], result)

    def test_enqueue_and_process_no_match(self):
        self.manager.enqueue_import("Sonarr", "Unknown.File")
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)

    def test_case_insensitive_matching(self):
        self.manager.enqueue_import("Sonarr", "file.a")
        result = self.manager.process(self.model_file_names)
        self.assertEqual(["File.A"], result)

    def test_multiple_enqueues_processed_in_one_call(self):
        self.manager.enqueue_import("Sonarr", "File.A")
        self.manager.enqueue_import("Radarr", "File.B")
        result = self.manager.process(self.model_file_names)
        self.assertIn("File.A", result)
        self.assertIn("File.B", result)
        self.assertEqual(2, len(result))

    def test_queue_drained_after_process(self):
        self.manager.enqueue_import("Sonarr", "File.A")
        self.manager.process(self.model_file_names)
        # Second call should return empty
        result = self.manager.process(self.model_file_names)
        self.assertEqual([], result)

    def test_process_with_empty_model(self):
        self.manager.enqueue_import("Sonarr", "File.A")
        result = self.manager.process(set())
        self.assertEqual([], result)

    def test_enqueue_logs_info(self):
        self.manager.enqueue_import("Sonarr", "File.A")
        self.manager.logger.info.assert_called_with(
            "Sonarr webhook import enqueued: 'File.A'"
        )

    def test_matched_import_logs_info(self):
        self.manager.enqueue_import("Sonarr", "File.A")
        self.manager.process(self.model_file_names)
        self.manager.logger.info.assert_any_call(
            "Sonarr import detected: 'File.A' (matched SeedSync file 'File.A')"
        )

    def test_unmatched_import_logs_debug(self):
        self.manager.enqueue_import("Sonarr", "Unknown.File")
        self.manager.process(self.model_file_names)
        self.manager.logger.debug.assert_any_call(
            "Sonarr webhook file 'Unknown.File' not in SeedSync model"
        )
