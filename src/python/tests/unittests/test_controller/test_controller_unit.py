# Copyright 2017, Inderpreet Singh, All rights reserved.

import unittest
from unittest.mock import MagicMock, patch, call
from queue import Queue

from controller import Controller
from controller.controller import ControllerError
from controller.controller_persist import ControllerPersist
from model import ModelFile, ModelError, IModelListener
from lftp import LftpError, LftpJobStatusParserError


class BaseControllerTestCase(unittest.TestCase):
    """Base class that patches all 6 Controller internal dependencies."""

    def setUp(self):
        self.mock_context = MagicMock()
        self.mock_context.logger = MagicMock()
        self.persist = ControllerPersist(max_tracked_files=100)

        # Start patches for all 6 internal dependencies
        self.patcher_mb = patch('controller.controller.ModelBuilder')
        self.patcher_lftp = patch('controller.controller.LftpManager')
        self.patcher_sm = patch('controller.controller.ScanManager')
        self.patcher_fom = patch('controller.controller.FileOperationManager')
        self.patcher_mpl = patch('controller.controller.MultiprocessingLogger')
        self.patcher_mm = patch('controller.controller.MemoryMonitor')

        self.mock_model_builder_cls = self.patcher_mb.start()
        self.mock_lftp_manager_cls = self.patcher_lftp.start()
        self.mock_scan_manager_cls = self.patcher_sm.start()
        self.mock_file_op_manager_cls = self.patcher_fom.start()
        self.mock_mp_logger_cls = self.patcher_mpl.start()
        self.mock_memory_monitor_cls = self.patcher_mm.start()

        # Get mock instances (return values of mock classes)
        self.mock_model_builder = self.mock_model_builder_cls.return_value
        self.mock_lftp_manager = self.mock_lftp_manager_cls.return_value
        self.mock_scan_manager = self.mock_scan_manager_cls.return_value
        self.mock_file_op_manager = self.mock_file_op_manager_cls.return_value
        self.mock_mp_logger = self.mock_mp_logger_cls.return_value
        self.mock_memory_monitor = self.mock_memory_monitor_cls.return_value

        self.controller = Controller(context=self.mock_context, persist=self.persist)

    def tearDown(self):
        self.patcher_mb.stop()
        self.patcher_lftp.stop()
        self.patcher_sm.stop()
        self.patcher_fom.stop()
        self.patcher_mpl.stop()
        self.patcher_mm.stop()

    def _make_controller_started(self):
        """Helper: set __started flag and configure no-op model update mocks."""
        self.controller._Controller__started = True
        self.mock_scan_manager.pop_latest_results.return_value = (None, None, None)
        self.mock_lftp_manager.status.return_value = None
        self.mock_file_op_manager.pop_extract_statuses.return_value = None
        self.mock_file_op_manager.pop_completed_extractions.return_value = []
        self.mock_model_builder.has_changes.return_value = False

    def _add_file_to_model(self, name, is_dir=False, state=ModelFile.State.DEFAULT,
                           remote_size=None, local_size=None):
        """Helper: create a ModelFile, set properties, add to controller's model."""
        f = ModelFile(name, is_dir)
        if state != ModelFile.State.DEFAULT:
            f.state = state
        if remote_size is not None:
            f.remote_size = remote_size
        if local_size is not None:
            f.local_size = local_size
        self.controller._Controller__model.add_file(f)
        return f

    def _queue_and_process_command(self, action, filename, callbacks=None):
        """Helper: create command, optionally add callbacks, queue, and process."""
        cmd = Controller.Command(action, filename)
        if callbacks:
            for cb in callbacks:
                cmd.add_callback(cb)
        self.controller.queue_command(cmd)
        self.controller.process()
        return cmd


class TestControllerInit(BaseControllerTestCase):
    """Tests for Controller.__init__ constructor."""

    def test_init_creates_model_builder(self):
        self.mock_model_builder_cls.assert_called_once()
        self.mock_model_builder.set_base_logger.assert_called_once()
        self.mock_model_builder.set_downloaded_files.assert_called_once_with(
            self.persist.downloaded_file_names
        )
        self.mock_model_builder.set_extracted_files.assert_called_once_with(
            self.persist.extracted_file_names
        )

    def test_init_creates_lftp_manager(self):
        self.mock_lftp_manager_cls.assert_called_once()

    def test_init_creates_scan_manager(self):
        self.mock_scan_manager_cls.assert_called_once()

    def test_init_creates_file_operation_manager(self):
        self.mock_file_op_manager_cls.assert_called_once()

    def test_init_creates_memory_monitor(self):
        self.mock_memory_monitor_cls.assert_called_once()
        self.mock_memory_monitor.set_base_logger.assert_called_once()
        # 7 data sources: downloaded_files, extracted_files, stopped_files,
        # model_files, downloaded_evictions, extracted_evictions, stopped_evictions
        self.assertEqual(7, self.mock_memory_monitor.register_data_source.call_count)

    def test_init_creates_multiprocessing_logger(self):
        self.mock_mp_logger_cls.assert_called_once()

    def test_init_creates_logger_as_child(self):
        self.mock_context.logger.getChild.assert_called_with("Controller")
        self.assertEqual(
            self.mock_context.logger.getChild.return_value,
            self.controller.logger
        )


class TestControllerLifecycle(BaseControllerTestCase):
    """Tests for Controller start/exit/process lifecycle."""

    def test_start_starts_scan_manager(self):
        self.controller.start()
        self.mock_scan_manager.start.assert_called_once()

    def test_start_starts_file_op_manager(self):
        self.controller.start()
        self.mock_file_op_manager.start.assert_called_once()

    def test_start_starts_mp_logger(self):
        self.controller.start()
        self.mock_mp_logger.start.assert_called_once()

    def test_exit_stops_all_managers(self):
        self.controller.start()
        self.controller.exit()
        self.mock_lftp_manager.exit.assert_called_once()
        self.mock_scan_manager.stop.assert_called_once()
        self.mock_file_op_manager.stop.assert_called_once()
        self.mock_mp_logger.stop.assert_called_once()

    def test_exit_without_start_is_safe(self):
        self.controller.exit()  # should not raise
        self.mock_scan_manager.stop.assert_not_called()

    def test_process_without_start_raises_error(self):
        with self.assertRaises(ControllerError):
            self.controller.process()


class TestControllerPublicAPI(BaseControllerTestCase):
    """Tests for Controller public API methods."""

    def test_get_model_files_returns_empty_list(self):
        result = self.controller.get_model_files()
        self.assertEqual([], result)

    def test_get_model_files_returns_added_files(self):
        self._add_file_to_model("file1", remote_size=100)
        self._add_file_to_model("file2", remote_size=200)
        result = self.controller.get_model_files()
        self.assertEqual(2, len(result))
        names = {f.name for f in result}
        self.assertEqual({"file1", "file2"}, names)

    def test_is_file_stopped_false_initially(self):
        self.assertFalse(self.controller.is_file_stopped("file"))

    def test_is_file_stopped_true_after_adding(self):
        self.persist.stopped_file_names.add("stopped_file")
        self.assertTrue(self.controller.is_file_stopped("stopped_file"))

    def test_is_file_downloaded_false_initially(self):
        self.assertFalse(self.controller.is_file_downloaded("file"))

    def test_is_file_downloaded_true_after_adding(self):
        self.persist.downloaded_file_names.add("dl_file")
        self.assertTrue(self.controller.is_file_downloaded("dl_file"))

    def test_add_model_listener(self):
        mock_listener = MagicMock(spec=IModelListener)
        self.controller.add_model_listener(mock_listener)
        # Adding a file should trigger the listener
        self._add_file_to_model("new_file", remote_size=100)
        mock_listener.file_added.assert_called_once()

    def test_remove_model_listener(self):
        mock_listener = MagicMock(spec=IModelListener)
        self.controller.add_model_listener(mock_listener)
        self.controller.remove_model_listener(mock_listener)
        # Adding a file should NOT trigger the removed listener
        self._add_file_to_model("new_file", remote_size=100)
        mock_listener.file_added.assert_not_called()

    def test_get_model_files_and_add_listener_returns_files(self):
        self._add_file_to_model("existing_file", remote_size=100)
        mock_listener = MagicMock(spec=IModelListener)
        result = self.controller.get_model_files_and_add_listener(mock_listener)
        self.assertEqual(1, len(result))
        self.assertEqual("existing_file", result[0].name)
        # Listener should be active - adding another file triggers it
        self._add_file_to_model("another_file", remote_size=200)
        mock_listener.file_added.assert_called_once()

    def test_queue_command_adds_to_queue(self):
        cmd = Controller.Command(Controller.Command.Action.QUEUE, "file")
        self.controller.queue_command(cmd)
        self.assertEqual(1, self.controller._Controller__command_queue.qsize())


class TestControllerCommandQueue(BaseControllerTestCase):
    """Tests for QUEUE command processing."""

    def setUp(self):
        super().setUp()
        self._make_controller_started()

    def test_queue_success_calls_lftp_queue(self):
        self._add_file_to_model("file", remote_size=5000)
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "file", [mock_cb]
        )
        self.mock_lftp_manager.queue.assert_called_once_with("file", False)
        mock_cb.on_success.assert_called_once()

    def test_queue_directory_calls_lftp_with_is_dir_true(self):
        self._add_file_to_model("dir", is_dir=True, remote_size=5000)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "dir"
        )
        self.mock_lftp_manager.queue.assert_called_once_with("dir", True)

    def test_queue_no_remote_size_returns_404(self):
        self._add_file_to_model("file", remote_size=None)
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertIn("does not exist remotely", args[0][0])
        self.assertEqual(404, args[0][1])

    def test_queue_lftp_error_returns_500(self):
        self._add_file_to_model("file", remote_size=5000)
        self.mock_lftp_manager.queue.side_effect = LftpError("connection failed")
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(500, args[0][1])

    def test_queue_removes_from_stopped_files(self):
        self.persist.stopped_file_names.add("file")
        self._add_file_to_model("file", remote_size=5000)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "file"
        )
        self.assertNotIn("file", self.persist.stopped_file_names)


class TestControllerCommandStop(BaseControllerTestCase):
    """Tests for STOP command processing."""

    def setUp(self):
        super().setUp()
        self._make_controller_started()

    def test_stop_downloading_file_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADING, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.STOP, "file", [mock_cb]
        )
        self.mock_lftp_manager.kill.assert_called_once_with("file")
        mock_cb.on_success.assert_called_once()

    def test_stop_queued_file_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.QUEUED, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.STOP, "file", [mock_cb]
        )
        mock_cb.on_success.assert_called_once()

    def test_stop_default_state_returns_409(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DEFAULT, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.STOP, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertIn("not Queued or Downloading", args[0][0])
        self.assertEqual(409, args[0][1])

    def test_stop_lftp_error_returns_500(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADING, remote_size=5000
        )
        self.mock_lftp_manager.kill.side_effect = LftpError("error")
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.STOP, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(500, args[0][1])

    def test_stop_lftp_parser_error_returns_500(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADING, remote_size=5000
        )
        self.mock_lftp_manager.kill.side_effect = LftpJobStatusParserError("parse error")
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.STOP, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(500, args[0][1])

    def test_stop_adds_to_stopped_files(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADING, remote_size=5000
        )
        self._queue_and_process_command(
            Controller.Command.Action.STOP, "file"
        )
        self.assertIn("file", self.persist.stopped_file_names)


class TestControllerCommandExtract(BaseControllerTestCase):
    """Tests for EXTRACT command processing."""

    def setUp(self):
        super().setUp()
        self._make_controller_started()

    def test_extract_downloaded_file_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADED, local_size=5000, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.EXTRACT, "file", [mock_cb]
        )
        self.mock_file_op_manager.extract.assert_called_once()
        mock_cb.on_success.assert_called_once()

    def test_extract_default_state_with_local_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DEFAULT, local_size=5000, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.EXTRACT, "file", [mock_cb]
        )
        mock_cb.on_success.assert_called_once()

    def test_extract_extracted_state_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.EXTRACTED, local_size=5000, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.EXTRACT, "file", [mock_cb]
        )
        mock_cb.on_success.assert_called_once()

    def test_extract_downloading_state_returns_409(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADING, remote_size=5000, local_size=1000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.EXTRACT, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(409, args[0][1])

    def test_extract_no_local_size_returns_404(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADED, remote_size=5000, local_size=None
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.EXTRACT, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertIn("does not exist locally", args[0][0])
        self.assertEqual(404, args[0][1])


class TestControllerCommandDelete(BaseControllerTestCase):
    """Tests for DELETE_LOCAL and DELETE_REMOTE command processing."""

    def setUp(self):
        super().setUp()
        self._make_controller_started()

    def test_delete_local_downloaded_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADED, local_size=5000, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_LOCAL, "file", [mock_cb]
        )
        self.mock_file_op_manager.delete_local.assert_called_once()
        mock_cb.on_success.assert_called_once()

    def test_delete_local_downloading_returns_409(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADING, remote_size=5000, local_size=1000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_LOCAL, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(409, args[0][1])

    def test_delete_local_no_local_returns_404(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DEFAULT, remote_size=5000, local_size=None
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_LOCAL, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(404, args[0][1])

    def test_delete_local_adds_to_stopped(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADED, local_size=5000, remote_size=5000
        )
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_LOCAL, "file"
        )
        self.assertIn("file", self.persist.stopped_file_names)

    def test_delete_remote_default_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DEFAULT, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_REMOTE, "file", [mock_cb]
        )
        self.mock_file_op_manager.delete_remote.assert_called_once()
        mock_cb.on_success.assert_called_once()

    def test_delete_remote_deleted_state_succeeds(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DELETED, remote_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_REMOTE, "file", [mock_cb]
        )
        mock_cb.on_success.assert_called_once()

    def test_delete_remote_downloading_returns_409(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DOWNLOADING, remote_size=5000, local_size=1000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_REMOTE, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(409, args[0][1])

    def test_delete_remote_no_remote_returns_404(self):
        self._add_file_to_model(
            "file", state=ModelFile.State.DEFAULT, remote_size=None, local_size=5000
        )
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.DELETE_REMOTE, "file", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertEqual(404, args[0][1])


class TestControllerCommandCommon(BaseControllerTestCase):
    """Tests for common command processing paths."""

    def setUp(self):
        super().setUp()
        self._make_controller_started()

    def test_command_file_not_found_returns_404(self):
        mock_cb = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "nonexistent", [mock_cb]
        )
        mock_cb.on_failure.assert_called_once()
        args = mock_cb.on_failure.call_args
        self.assertIn("not found", args[0][0])
        self.assertEqual(404, args[0][1])

    def test_command_success_notifies_all_callbacks(self):
        self._add_file_to_model("file", remote_size=5000)
        mock_cb1 = MagicMock(spec=Controller.Command.ICallback)
        mock_cb2 = MagicMock(spec=Controller.Command.ICallback)
        mock_cb3 = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "file", [mock_cb1, mock_cb2, mock_cb3]
        )
        mock_cb1.on_success.assert_called_once()
        mock_cb2.on_success.assert_called_once()
        mock_cb3.on_success.assert_called_once()

    def test_command_failure_notifies_all_callbacks(self):
        mock_cb1 = MagicMock(spec=Controller.Command.ICallback)
        mock_cb2 = MagicMock(spec=Controller.Command.ICallback)
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "nonexistent", [mock_cb1, mock_cb2]
        )
        mock_cb1.on_failure.assert_called_once()
        mock_cb2.on_failure.assert_called_once()

    def test_command_no_callbacks_no_crash(self):
        self._add_file_to_model("file", remote_size=5000)
        # Should not raise even with no callbacks
        self._queue_and_process_command(
            Controller.Command.Action.QUEUE, "file"
        )

    def test_multiple_commands_in_single_process(self):
        self._add_file_to_model("file1", remote_size=5000)
        self._add_file_to_model("file2", remote_size=3000)
        mock_cb1 = MagicMock(spec=Controller.Command.ICallback)
        mock_cb2 = MagicMock(spec=Controller.Command.ICallback)
        cmd1 = Controller.Command(Controller.Command.Action.QUEUE, "file1")
        cmd1.add_callback(mock_cb1)
        cmd2 = Controller.Command(Controller.Command.Action.QUEUE, "file2")
        cmd2.add_callback(mock_cb2)
        self.controller.queue_command(cmd1)
        self.controller.queue_command(cmd2)
        self.controller.process()
        mock_cb1.on_success.assert_called_once()
        mock_cb2.on_success.assert_called_once()
        self.assertEqual(2, self.mock_lftp_manager.queue.call_count)
