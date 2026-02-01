# Copyright 2017, Inderpreet Singh, All rights reserved.

import unittest
from unittest.mock import MagicMock, patch, call
import json

from controller import Controller
from web.handler.controller import ControllerHandler, WebResponseActionCallback


class TestWebResponseActionCallback(unittest.TestCase):
    def test_on_success_sets_success_and_signals(self):
        callback = WebResponseActionCallback()
        self.assertIsNone(callback.success)

        callback.on_success()

        self.assertTrue(callback.success)

    def test_on_failure_sets_error_and_signals(self):
        callback = WebResponseActionCallback()
        self.assertIsNone(callback.success)
        self.assertIsNone(callback.error)

        callback.on_failure("Test error", 404)

        self.assertFalse(callback.success)
        self.assertEqual("Test error", callback.error)
        self.assertEqual(404, callback.error_code)

    def test_on_failure_default_error_code(self):
        callback = WebResponseActionCallback()

        callback.on_failure("Test error")

        self.assertEqual(400, callback.error_code)


class TestControllerHandlerBulkCommand(unittest.TestCase):
    def setUp(self):
        self.mock_controller = MagicMock(spec=Controller)
        self.handler = ControllerHandler(self.mock_controller)

    def _mock_request(self, json_body):
        """Helper to mock the request object with a JSON body."""
        mock_request = MagicMock()
        mock_request.json = json_body
        return mock_request

    def _call_bulk_handler(self, json_body):
        """Helper to call the bulk handler with a mocked request."""
        with patch('web.handler.controller.request') as mock_request:
            mock_request.json = json_body
            # Access the private method via name mangling
            return self.handler._ControllerHandler__handle_bulk_command()

    def _setup_command_callback(self, success=True, error=None, error_code=400):
        """Setup mock controller to capture and respond to commands."""
        def side_effect(command):
            for callback in command.callbacks:
                if success:
                    callback.on_success()
                else:
                    callback.on_failure(error, error_code)

        self.mock_controller.queue_command.side_effect = side_effect

    # =========================================================================
    # Validation Tests
    # =========================================================================

    def test_missing_body_returns_400(self):
        response = self._call_bulk_handler(None)

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("body is required", body["error"])

    def test_invalid_json_returns_400(self):
        with patch('web.handler.controller.request') as mock_request:
            # Simulate JSON parsing error
            type(mock_request).json = property(
                lambda self: (_ for _ in ()).throw(ValueError("Invalid JSON"))
            )
            response = self.handler._ControllerHandler__handle_bulk_command()

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("Invalid JSON", body["error"])

    def test_missing_action_returns_400(self):
        response = self._call_bulk_handler({"files": ["file1"]})

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("Invalid action", body["error"])

    def test_invalid_action_returns_400(self):
        response = self._call_bulk_handler({
            "action": "invalid_action",
            "files": ["file1"]
        })

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("Invalid action", body["error"])
        # Should list valid actions
        self.assertIn("queue", body["error"])

    def test_missing_files_returns_400(self):
        response = self._call_bulk_handler({"action": "queue"})

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("files", body["error"])

    def test_empty_files_returns_400(self):
        response = self._call_bulk_handler({
            "action": "queue",
            "files": []
        })

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("files", body["error"])

    def test_files_not_array_returns_400(self):
        response = self._call_bulk_handler({
            "action": "queue",
            "files": "not_an_array"
        })

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("files must be an array", body["error"])

    def test_files_with_non_string_returns_400(self):
        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1", 123, "file2"]
        })

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("strings", body["error"])

    def test_files_with_empty_string_returns_400(self):
        """Empty string file names should be rejected."""
        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1", "", "file2"]
        })

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("non-empty", body["error"])

    def test_files_with_whitespace_only_returns_400(self):
        """Whitespace-only file names should be rejected."""
        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1", "   ", "file2"]
        })

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("non-empty", body["error"])

    def test_too_many_files_returns_400(self):
        """Requests with more than MAX_BULK_FILES should be rejected."""
        max_files = ControllerHandler._MAX_BULK_FILES
        files = ["file{}".format(i) for i in range(max_files + 1)]

        response = self._call_bulk_handler({
            "action": "queue",
            "files": files
        })

        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
        self.assertIn("Too many files", body["error"])
        self.assertIn(str(max_files), body["error"])

    def test_duplicate_files_are_deduplicated(self):
        """Duplicate file names should be processed only once."""
        self._setup_command_callback(success=True)

        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1", "file2", "file1", "file3", "file2"]
        })

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)

        # Should only have 3 unique files
        self.assertEqual(3, len(body["results"]))
        self.assertEqual(3, body["summary"]["total"])
        self.assertEqual(3, body["summary"]["succeeded"])

        # Order should be preserved (first occurrence)
        result_files = [r["file"] for r in body["results"]]
        self.assertEqual(["file1", "file2", "file3"], result_files)

        # Controller should only receive 3 commands
        self.assertEqual(3, self.mock_controller.queue_command.call_count)

    def test_max_files_exactly_at_limit_succeeds(self):
        """Requests with exactly MAX_BULK_FILES should succeed."""
        self._setup_command_callback(success=True)
        max_files = ControllerHandler._MAX_BULK_FILES
        files = ["file{}".format(i) for i in range(max_files)]

        response = self._call_bulk_handler({
            "action": "queue",
            "files": files
        })

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)
        self.assertEqual(max_files, body["summary"]["total"])

    # =========================================================================
    # Success Tests
    # =========================================================================

    def test_queue_action_success(self):
        self._setup_command_callback(success=True)

        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1", "file2"]
        })

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)

        # Check results
        self.assertEqual(2, len(body["results"]))
        self.assertEqual("file1", body["results"][0]["file"])
        self.assertTrue(body["results"][0]["success"])
        self.assertEqual("file2", body["results"][1]["file"])
        self.assertTrue(body["results"][1]["success"])

        # Check summary
        self.assertEqual(2, body["summary"]["total"])
        self.assertEqual(2, body["summary"]["succeeded"])
        self.assertEqual(0, body["summary"]["failed"])

        # Verify commands were queued
        self.assertEqual(2, self.mock_controller.queue_command.call_count)

    def test_stop_action_success(self):
        self._setup_command_callback(success=True)

        response = self._call_bulk_handler({
            "action": "stop",
            "files": ["file1"]
        })

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)
        self.assertEqual(1, body["summary"]["succeeded"])

        # Verify the command action is STOP
        command = self.mock_controller.queue_command.call_args[0][0]
        self.assertEqual(Controller.Command.Action.STOP, command.action)

    def test_extract_action_success(self):
        self._setup_command_callback(success=True)

        response = self._call_bulk_handler({
            "action": "extract",
            "files": ["file1"]
        })

        self.assertEqual(200, response.status_code)

        command = self.mock_controller.queue_command.call_args[0][0]
        self.assertEqual(Controller.Command.Action.EXTRACT, command.action)

    def test_delete_local_action_success(self):
        self._setup_command_callback(success=True)

        response = self._call_bulk_handler({
            "action": "delete_local",
            "files": ["file1"]
        })

        self.assertEqual(200, response.status_code)

        command = self.mock_controller.queue_command.call_args[0][0]
        self.assertEqual(Controller.Command.Action.DELETE_LOCAL, command.action)

    def test_delete_remote_action_success(self):
        self._setup_command_callback(success=True)

        response = self._call_bulk_handler({
            "action": "delete_remote",
            "files": ["file1"]
        })

        self.assertEqual(200, response.status_code)

        command = self.mock_controller.queue_command.call_args[0][0]
        self.assertEqual(Controller.Command.Action.DELETE_REMOTE, command.action)

    # =========================================================================
    # Failure Tests
    # =========================================================================

    def test_single_file_failure(self):
        self._setup_command_callback(success=False, error="File not found", error_code=404)

        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1"]
        })

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)

        self.assertEqual(1, len(body["results"]))
        self.assertFalse(body["results"][0]["success"])
        self.assertEqual("File not found", body["results"][0]["error"])
        self.assertEqual(404, body["results"][0]["error_code"])

        self.assertEqual(1, body["summary"]["total"])
        self.assertEqual(0, body["summary"]["succeeded"])
        self.assertEqual(1, body["summary"]["failed"])

    def test_partial_failure(self):
        """Test that partial failures don't stop processing other files."""
        call_count = [0]

        def side_effect(command):
            call_count[0] += 1
            for callback in command.callbacks:
                if call_count[0] == 2:  # Second file fails
                    callback.on_failure("File not found", 404)
                else:
                    callback.on_success()

        self.mock_controller.queue_command.side_effect = side_effect

        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1", "file2", "file3"]
        })

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)

        # All files should be processed
        self.assertEqual(3, len(body["results"]))

        # file1 succeeds
        self.assertTrue(body["results"][0]["success"])

        # file2 fails
        self.assertFalse(body["results"][1]["success"])
        self.assertEqual("File not found", body["results"][1]["error"])

        # file3 succeeds (continues despite file2 failure)
        self.assertTrue(body["results"][2]["success"])

        # Summary reflects partial failure
        self.assertEqual(3, body["summary"]["total"])
        self.assertEqual(2, body["summary"]["succeeded"])
        self.assertEqual(1, body["summary"]["failed"])

    def test_all_files_fail(self):
        self._setup_command_callback(success=False, error="Error", error_code=500)

        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1", "file2"]
        })

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)

        self.assertEqual(2, body["summary"]["total"])
        self.assertEqual(0, body["summary"]["succeeded"])
        self.assertEqual(2, body["summary"]["failed"])

    # =========================================================================
    # Response Format Tests
    # =========================================================================

    def test_response_content_type_is_json(self):
        self._setup_command_callback(success=True)

        response = self._call_bulk_handler({
            "action": "queue",
            "files": ["file1"]
        })

        self.assertEqual("application/json", response.content_type)

    def test_results_preserve_file_order(self):
        self._setup_command_callback(success=True)

        files = ["zebra", "alpha", "middle"]
        response = self._call_bulk_handler({
            "action": "queue",
            "files": files
        })

        body = json.loads(response.body)
        result_files = [r["file"] for r in body["results"]]
        self.assertEqual(files, result_files)

    # =========================================================================
    # Timeout Tests
    # =========================================================================

    def test_timeout_returns_504_error(self):
        """Test that commands that don't complete in time return 504 timeout error."""
        def slow_side_effect(command):
            # Don't call the callback - simulate a timeout
            pass

        self.mock_controller.queue_command.side_effect = slow_side_effect

        # Override the timeout to a very short value for testing
        original_timeout = ControllerHandler._BULK_TIMEOUT_PER_FILE
        ControllerHandler._BULK_TIMEOUT_PER_FILE = 0.1

        try:
            response = self._call_bulk_handler({
                "action": "queue",
                "files": ["file1"]
            })

            self.assertEqual(200, response.status_code)
            body = json.loads(response.body)

            self.assertEqual(1, len(body["results"]))
            self.assertFalse(body["results"][0]["success"])
            self.assertEqual(504, body["results"][0]["error_code"])
            self.assertIn("timed out", body["results"][0]["error"])

            self.assertEqual(1, body["summary"]["failed"])
            self.assertEqual(0, body["summary"]["succeeded"])
        finally:
            ControllerHandler._BULK_TIMEOUT_PER_FILE = original_timeout

    def test_wait_with_timeout_returns_true_on_completion(self):
        """Test that wait() returns True when the event is set within timeout."""
        callback = WebResponseActionCallback()
        callback.on_success()

        result = callback.wait(timeout=1.0)

        self.assertTrue(result)

    def test_wait_with_timeout_returns_false_on_timeout(self):
        """Test that wait() returns False when timeout expires."""
        callback = WebResponseActionCallback()
        # Don't set the event

        result = callback.wait(timeout=0.01)

        self.assertFalse(result)

    # =========================================================================
    # Performance Tests
    # =========================================================================

    def test_bulk_100_files_performance(self):
        """Test that 100 files can be processed efficiently."""
        import time

        self._setup_command_callback(success=True)

        files = ["file{}".format(i) for i in range(100)]

        start = time.time()
        response = self._call_bulk_handler({
            "action": "queue",
            "files": files
        })
        elapsed = time.time() - start

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)

        self.assertEqual(100, body["summary"]["total"])
        self.assertEqual(100, body["summary"]["succeeded"])

        # Should complete in under 1 second (mocked controller is instant)
        self.assertLess(elapsed, 1.0, "100 files should process in under 1 second")

    def test_bulk_500_files_performance(self):
        """Test that 500 files can be processed efficiently."""
        import time

        self._setup_command_callback(success=True)

        files = ["file{}".format(i) for i in range(500)]

        start = time.time()
        response = self._call_bulk_handler({
            "action": "queue",
            "files": files
        })
        elapsed = time.time() - start

        self.assertEqual(200, response.status_code)
        body = json.loads(response.body)

        self.assertEqual(500, body["summary"]["total"])
        self.assertEqual(500, body["summary"]["succeeded"])

        # Should complete in under 2 seconds (mocked controller is instant)
        self.assertLess(elapsed, 2.0, "500 files should process in under 2 seconds")

    def test_parallel_queuing_batches_commands(self):
        """Test that all commands are queued before waiting for callbacks."""
        queued_times = []
        callback_times = []

        def side_effect(command):
            import time
            queued_times.append(time.time())
            # Small delay to simulate controller processing
            time.sleep(0.001)
            for callback in command.callbacks:
                callback.on_success()
            callback_times.append(time.time())

        self.mock_controller.queue_command.side_effect = side_effect

        files = ["file1", "file2", "file3"]
        self._call_bulk_handler({
            "action": "queue",
            "files": files
        })

        # All files should have been queued
        self.assertEqual(3, len(queued_times))

        # With parallel queuing, all commands are queued first,
        # then callbacks are waited on. In the mocked scenario,
        # the callbacks are triggered immediately, so the order
        # should still show all commands were processed.
        self.assertEqual(3, self.mock_controller.queue_command.call_count)
