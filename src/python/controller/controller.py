# Copyright 2017, Inderpreet Singh, All rights reserved.

from abc import ABC, abstractmethod
from typing import List, Callable, Optional, Tuple
from threading import Lock
from queue import Queue
from enum import Enum

# my libs
from .scan import ScannerProcess, ActiveScanner, LocalScanner, RemoteScanner
from .extract import ExtractProcess, ExtractStatus
from .model_builder import ModelBuilder
from .memory_monitor import MemoryMonitor
from common import Context, AppError, MultiprocessingLogger, AppOneShotProcess, Constants
from model import ModelError, ModelFile, Model, ModelDiff, ModelDiffUtil, IModelListener
from lftp import Lftp, LftpError, LftpJobStatus, LftpJobStatusParserError
from .controller_persist import ControllerPersist
from .delete import DeleteLocalProcess, DeleteRemoteProcess


class ControllerError(AppError):
    """
    Exception indicating a controller error
    """
    pass


class Controller:
    """
    Top-level class that controls the behaviour of the app
    """
    class Command:
        """
        Class by which clients of Controller can request Actions to be executed
        Supports callbacks by which clients can be notified of action success/failure
        Note: callbacks will be executed in Controller thread, so any heavy computation
              should be moved out of the callback
        """
        class Action(Enum):
            QUEUE = 0
            STOP = 1
            EXTRACT = 2
            DELETE_LOCAL = 3
            DELETE_REMOTE = 4

        class ICallback(ABC):
            """Command callback interface"""
            @abstractmethod
            def on_success(self):
                """Called on successful completion of action"""
                pass

            @abstractmethod
            def on_failure(self, error: str, error_code: int = 400):
                """
                Called on action failure.

                Args:
                    error: Human-readable error message
                    error_code: HTTP status code for the error (default 400)
                        - 400: Bad request (invalid state, validation error)
                        - 404: Resource not found
                        - 409: Conflict (resource in wrong state)
                        - 500: Internal server error
                """
                pass

        def __init__(self, action: Action, filename: str):
            self.action = action
            self.filename = filename
            self.callbacks = []

        def add_callback(self, callback: ICallback):
            self.callbacks.append(callback)

    class CommandProcessWrapper:
        """
        Wraps any one-shot command processes launched by the controller
        """
        def __init__(self, process: AppOneShotProcess, post_callback: Callable):
            self.process = process
            self.post_callback = post_callback

    def __init__(self,
                 context: Context,
                 persist: ControllerPersist):
        self.__context = context
        self.__persist = persist
        self.logger = context.logger.getChild("Controller")
        # Set logger for persist to enable eviction logging
        self.__persist.set_base_logger(self.logger)

        # Decide the password here
        self.__password = context.config.lftp.remote_password if not context.config.lftp.use_ssh_key else None

        # The command queue
        self.__command_queue = Queue()

        # The model
        self.__model = Model()
        self.__model.set_base_logger(self.logger)
        # Lock for the model
        # Note: While the scanners are in a separate process, the rest of the application
        #       is threaded in a single process. (The webserver is bottle+paste which is
        #       multi-threaded). Therefore it is safe to use a threading Lock for the model
        #       (the scanner processes never try to access the model)
        self.__model_lock = Lock()

        # Model builder
        self.__model_builder = ModelBuilder()
        self.__model_builder.set_base_logger(self.logger)
        self.__model_builder.set_downloaded_files(self.__persist.downloaded_file_names)
        self.__model_builder.set_extracted_files(self.__persist.extracted_file_names)

        # Lftp
        self.__lftp = Lftp(address=self.__context.config.lftp.remote_address,
                           port=self.__context.config.lftp.remote_port,
                           user=self.__context.config.lftp.remote_username,
                           password=self.__password)
        self.__lftp.set_base_logger(self.logger)
        self.__lftp.set_base_remote_dir_path(self.__context.config.lftp.remote_path)
        self.__lftp.set_base_local_dir_path(self.__context.config.lftp.local_path)
        # Configure Lftp
        self.__lftp.num_parallel_jobs = self.__context.config.lftp.num_max_parallel_downloads
        self.__lftp.num_parallel_files = self.__context.config.lftp.num_max_parallel_files_per_download
        self.__lftp.num_connections_per_root_file = self.__context.config.lftp.num_max_connections_per_root_file
        self.__lftp.num_connections_per_dir_file = self.__context.config.lftp.num_max_connections_per_dir_file
        self.__lftp.num_max_total_connections = self.__context.config.lftp.num_max_total_connections
        self.__lftp.use_temp_file = self.__context.config.lftp.use_temp_file
        self.__lftp.temp_file_name = "*" + Constants.LFTP_TEMP_FILE_SUFFIX
        self.__lftp.set_verbose_logging(self.__context.config.general.verbose)

        # Setup the scanners and scanner processes
        self.__active_scanner = ActiveScanner(self.__context.config.lftp.local_path)
        self.__local_scanner = LocalScanner(
            local_path=self.__context.config.lftp.local_path,
            use_temp_file=self.__context.config.lftp.use_temp_file
        )
        self.__remote_scanner = RemoteScanner(
            remote_address=self.__context.config.lftp.remote_address,
            remote_username=self.__context.config.lftp.remote_username,
            remote_password=self.__password,
            remote_port=self.__context.config.lftp.remote_port,
            remote_path_to_scan=self.__context.config.lftp.remote_path,
            local_path_to_scan_script=self.__context.args.local_path_to_scanfs,
            remote_path_to_scan_script=self.__context.config.lftp.remote_path_to_scan_script
        )

        self.__active_scan_process = ScannerProcess(
            scanner=self.__active_scanner,
            interval_in_ms=self.__context.config.controller.interval_ms_downloading_scan,
            verbose=False
        )
        self.__local_scan_process = ScannerProcess(
            scanner=self.__local_scanner,
            interval_in_ms=self.__context.config.controller.interval_ms_local_scan,
        )
        self.__remote_scan_process = ScannerProcess(
            scanner=self.__remote_scanner,
            interval_in_ms=self.__context.config.controller.interval_ms_remote_scan,
        )

        # Setup extract process
        if self.__context.config.controller.use_local_path_as_extract_path:
            out_dir_path = self.__context.config.lftp.local_path
        else:
            out_dir_path = self.__context.config.controller.extract_path
        self.__extract_process = ExtractProcess(
            out_dir_path=out_dir_path,
            local_path=self.__context.config.lftp.local_path
        )

        # Setup multiprocess logging
        self.__mp_logger = MultiprocessingLogger(self.logger)
        self.__active_scan_process.set_multiprocessing_logger(self.__mp_logger)
        self.__local_scan_process.set_multiprocessing_logger(self.__mp_logger)
        self.__remote_scan_process.set_multiprocessing_logger(self.__mp_logger)
        self.__extract_process.set_multiprocessing_logger(self.__mp_logger)

        # Keep track of active files
        self.__active_downloading_file_names = []
        self.__active_extracting_file_names = []

        # Keep track of active command processes
        self.__active_command_processes = []

        # Memory monitor for detecting leaks
        self.__memory_monitor = MemoryMonitor()
        self.__memory_monitor.set_base_logger(self.logger)
        self.__memory_monitor.register_data_source(
            'downloaded_files',
            lambda: len(self.__persist.downloaded_file_names)
        )
        self.__memory_monitor.register_data_source(
            'extracted_files',
            lambda: len(self.__persist.extracted_file_names)
        )
        self.__memory_monitor.register_data_source(
            'model_files',
            lambda: len(self.__model.get_file_names())
        )
        # Register eviction stats for bounded collections
        self.__memory_monitor.register_data_source(
            'downloaded_evictions',
            lambda: self.__persist.downloaded_file_names.total_evictions
        )
        self.__memory_monitor.register_data_source(
            'extracted_evictions',
            lambda: self.__persist.extracted_file_names.total_evictions
        )

        self.__started = False

    def start(self):
        """
        Start the controller
        Must be called after ctor and before process()
        :return:
        """
        self.logger.debug("Starting controller")
        self.__active_scan_process.start()
        self.__local_scan_process.start()
        self.__remote_scan_process.start()
        self.__extract_process.start()
        self.__mp_logger.start()
        self.__started = True

    def process(self):
        """
        Advance the controller state
        This method should return relatively quickly as the heavy lifting is done by concurrent tasks
        :return:
        """
        if not self.__started:
            raise ControllerError("Cannot process, controller is not started")
        self.__propagate_exceptions()
        self.__cleanup_commands()
        self.__process_commands()
        self.__update_model()
        # Periodically log memory statistics
        self.__memory_monitor.log_stats_if_due()

    def exit(self):
        self.logger.debug("Exiting controller")
        if self.__started:
            self.__lftp.exit()
            self.__active_scan_process.terminate()
            self.__local_scan_process.terminate()
            self.__remote_scan_process.terminate()
            self.__extract_process.terminate()
            self.__active_scan_process.join()
            self.__local_scan_process.join()
            self.__remote_scan_process.join()
            self.__extract_process.join()
            self.__mp_logger.stop()
            self.__started = False
            self.logger.info("Exited controller")

    def get_model_files(self) -> List[ModelFile]:
        """
        Returns a copy of all the model files
        :return:
        """
        # Lock the model
        self.__model_lock.acquire()
        model_files = self.__get_model_files()
        # Release the model
        self.__model_lock.release()
        return model_files

    def add_model_listener(self, listener: IModelListener):
        """
        Adds a listener to the controller's model
        :param listener:
        :return:
        """
        # Lock the model
        self.__model_lock.acquire()
        self.__model.add_listener(listener)
        # Release the model
        self.__model_lock.release()

    def remove_model_listener(self, listener: IModelListener):
        """
        Removes a listener from the controller's model
        :param listener:
        :return:
        """
        # Lock the model
        self.__model_lock.acquire()
        self.__model.remove_listener(listener)
        # Release the model
        self.__model_lock.release()

    def get_model_files_and_add_listener(self, listener: IModelListener):
        """
        Adds a listener and returns the current state of model files in one atomic operation
        This guarantees that model update events are not missed or duplicated for the clients
        Without an atomic operation, the following scenarios can happen:
            1. get_model() -> model updated -> add_listener()
               The model update never propagates to client
            2. add_listener() -> model updated -> get_model()
               The model update is duplicated on client side (once through listener, and once
               through the model).
        :param listener:
        :return:
        """
        # Lock the model
        self.__model_lock.acquire()
        self.__model.add_listener(listener)
        model_files = self.__get_model_files()
        # Release the model
        self.__model_lock.release()
        return model_files

    def queue_command(self, command: Command):
        self.__command_queue.put(command)

    def __get_model_files(self) -> List[ModelFile]:
        # Files are frozen (immutable) after being added to the model,
        # so we can safely return direct references without deep copying.
        # This significantly reduces memory churn on API requests.
        model_files = []
        for filename in self.__model.get_file_names():
            model_files.append(self.__model.get_file(filename))
        return model_files

    # =========================================================================
    # __update_model() helper methods
    # =========================================================================

    def _collect_scan_results(self) -> Tuple[Optional[object], Optional[object], Optional[object]]:
        """
        Collect the latest scan results from all scanner processes.

        Returns:
            Tuple of (remote_scan, local_scan, active_scan) results.
            Each element is None if no new result is available.
        """
        latest_remote_scan = self.__remote_scan_process.pop_latest_result()
        latest_local_scan = self.__local_scan_process.pop_latest_result()
        latest_active_scan = self.__active_scan_process.pop_latest_result()
        return latest_remote_scan, latest_local_scan, latest_active_scan

    def _collect_lftp_status(self) -> Optional[List[LftpJobStatus]]:
        """
        Collect the current LFTP job statuses.

        Returns:
            List of LftpJobStatus objects, or None if an error occurred.
        """
        try:
            return self.__lftp.status()
        except (LftpError, LftpJobStatusParserError) as e:
            self.logger.warning("Caught lftp error: {}".format(str(e)))
            return None

    def _collect_extract_results(self) -> Tuple[Optional[object], List]:
        """
        Collect extract process status and completed extractions.

        Returns:
            Tuple of (extract_statuses, completed_extractions).
            extract_statuses is None if no new status available.
            completed_extractions is a list of completed extraction results.
        """
        latest_extract_statuses = self.__extract_process.pop_latest_statuses()
        latest_extracted_results = self.__extract_process.pop_completed()
        return latest_extract_statuses, latest_extracted_results

    def _update_active_file_tracking(self,
                                     lftp_statuses: Optional[List[LftpJobStatus]],
                                     extract_statuses: Optional[object]) -> None:
        """
        Update the lists of actively downloading and extracting files.

        Also updates the active scanner with the combined list of active files.

        Args:
            lftp_statuses: Current LFTP job statuses, or None.
            extract_statuses: Current extract statuses, or None.
        """
        if lftp_statuses is not None:
            self.__active_downloading_file_names = [
                s.name for s in lftp_statuses if s.state == LftpJobStatus.State.RUNNING
            ]
        if extract_statuses is not None:
            self.__active_extracting_file_names = [
                s.name for s in extract_statuses.statuses if s.state == ExtractStatus.State.EXTRACTING
            ]

        # Update the active scanner's state
        self.__active_scanner.set_active_files(
            self.__active_downloading_file_names + self.__active_extracting_file_names
        )

    def _feed_model_builder(self,
                            remote_scan: Optional[object],
                            local_scan: Optional[object],
                            active_scan: Optional[object],
                            lftp_statuses: Optional[List[LftpJobStatus]],
                            extract_statuses: Optional[object],
                            extracted_results: List) -> None:
        """
        Feed the model builder with all collected data.

        Updates the model builder's state with new scan results, LFTP statuses,
        and extract information. Also updates persist state for completed extractions.

        Args:
            remote_scan: Latest remote scan result, or None.
            local_scan: Latest local scan result, or None.
            active_scan: Latest active (downloading) scan result, or None.
            lftp_statuses: Current LFTP job statuses, or None.
            extract_statuses: Current extract statuses, or None.
            extracted_results: List of completed extraction results.
        """
        if remote_scan is not None:
            self.__model_builder.set_remote_files(remote_scan.files)
        if local_scan is not None:
            self.__model_builder.set_local_files(local_scan.files)
        if active_scan is not None:
            self.__model_builder.set_active_files(active_scan.files)
        if lftp_statuses is not None:
            self.__model_builder.set_lftp_statuses(lftp_statuses)
        if extract_statuses is not None:
            self.__model_builder.set_extract_statuses(extract_statuses.statuses)
        if extracted_results:
            for result in extracted_results:
                self.__persist.extracted_file_names.add(result.name)
            self.__model_builder.set_extracted_files(self.__persist.extracted_file_names)

    def _detect_and_track_download(self, diff: ModelDiff) -> None:
        """
        Detect if a file was just downloaded and update persist state.

        A file is considered "just downloaded" if:
        - It was added in DOWNLOADED state, OR
        - It was updated and transitioned TO DOWNLOADED state from a non-DOWNLOADED state

        Args:
            diff: A single model diff entry.
        """
        downloaded = False
        if diff.change == ModelDiff.Change.ADDED and \
                diff.new_file.state == ModelFile.State.DOWNLOADED:
            downloaded = True
        elif diff.change == ModelDiff.Change.UPDATED and \
                diff.new_file.state == ModelFile.State.DOWNLOADED and \
                diff.old_file.state != ModelFile.State.DOWNLOADED:
            downloaded = True

        if downloaded:
            self.__persist.downloaded_file_names.add(diff.new_file.name)
            self.__model_builder.set_downloaded_files(self.__persist.downloaded_file_names)

    def _prune_extracted_files(self) -> None:
        """
        Remove deleted files from the extracted files tracking list.

        This prevents files from going to EXTRACTED state if they are re-downloaded
        after being deleted locally.

        Must be called while holding the model lock.
        """
        remove_extracted_file_names = set()
        existing_file_names = self.__model.get_file_names()

        for extracted_file_name in self.__persist.extracted_file_names:
            if extracted_file_name in existing_file_names:
                file = self.__model.get_file(extracted_file_name)
                if file.state == ModelFile.State.DELETED:
                    # Deleted locally, remove
                    remove_extracted_file_names.add(extracted_file_name)
            # Note: Files not in model could be because scans aren't available yet

        if remove_extracted_file_names:
            self.logger.info("Removing from extracted list: {}".format(remove_extracted_file_names))
            self.__persist.extracted_file_names.difference_update(remove_extracted_file_names)
            self.__model_builder.set_extracted_files(self.__persist.extracted_file_names)

    def _prune_downloaded_files(self, latest_remote_scan: Optional[object]) -> None:
        """
        Remove deleted or missing files from the downloaded files tracking list.

        This prevents unbounded memory growth from tracking files indefinitely.
        After removal, the file returns to DEFAULT state on next scan if still remote.

        A file is removed from tracking if:
        - It exists in model but is in DELETED state, OR
        - It doesn't exist in model AND we've had a successful remote scan

        Must be called while holding the model lock.

        Args:
            latest_remote_scan: Latest remote scan result for checking scan availability.
        """
        remove_downloaded_file_names = set()
        existing_file_names = self.__model.get_file_names()

        for downloaded_file_name in self.__persist.downloaded_file_names:
            if downloaded_file_name in existing_file_names:
                file = self.__model.get_file(downloaded_file_name)
                if file.state == ModelFile.State.DELETED:
                    # Deleted locally, remove from tracking
                    remove_downloaded_file_names.add(downloaded_file_name)
            else:
                # Not in the model at all - file is completely gone from both local and remote
                # Only remove if we've had at least one successful remote scan
                if latest_remote_scan is not None and not latest_remote_scan.failed:
                    remove_downloaded_file_names.add(downloaded_file_name)

        if remove_downloaded_file_names:
            self.logger.info("Removing from downloaded list: {}".format(remove_downloaded_file_names))
            self.__persist.downloaded_file_names.difference_update(remove_downloaded_file_names)
            self.__model_builder.set_downloaded_files(self.__persist.downloaded_file_names)

    def _apply_model_diff(self, model_diff: List[ModelDiff]) -> None:
        """
        Apply model differences to update the internal model state.

        For each diff entry:
        - ADDED: Add the new file to the model
        - REMOVED: Remove the old file from the model
        - UPDATED: Update the file in the model

        Also detects newly downloaded files and updates tracking.

        Must be called while holding the model lock.

        Args:
            model_diff: List of model diff entries to apply.
        """
        for diff in model_diff:
            if diff.change == ModelDiff.Change.ADDED:
                self.__model.add_file(diff.new_file)
            elif diff.change == ModelDiff.Change.REMOVED:
                self.__model.remove_file(diff.old_file.name)
            elif diff.change == ModelDiff.Change.UPDATED:
                self.__model.update_file(diff.new_file)

            # Detect if a file was just Downloaded and update persist state
            self._detect_and_track_download(diff)

    def _build_and_apply_model(self, latest_remote_scan: Optional[object]) -> None:
        """
        Build a new model and apply changes if the model builder has updates.

        This method:
        1. Builds a new model from the model builder
        2. Diffs the new model against the current model
        3. Applies the diff (add/remove/update files)
        4. Tracks newly downloaded files
        5. Prunes stale entries from extracted/downloaded tracking lists

        All model operations are performed while holding the model lock.

        Args:
            latest_remote_scan: Latest remote scan result, used for pruning decisions.
        """
        if not self.__model_builder.has_changes():
            return

        new_model = self.__model_builder.build_model()

        # Lock the model for all modifications
        self.__model_lock.acquire()
        try:
            # Diff the new model with old model
            model_diff = ModelDiffUtil.diff_models(self.__model, new_model)

            # Apply changes to the model
            self._apply_model_diff(model_diff)

            # Prune stale tracking entries
            self._prune_extracted_files()
            self._prune_downloaded_files(latest_remote_scan)
        finally:
            # Release the model
            self.__model_lock.release()

    def _update_controller_status(self,
                                  remote_scan: Optional[object],
                                  local_scan: Optional[object]) -> None:
        """
        Update the controller status with latest scan information.

        Args:
            remote_scan: Latest remote scan result, or None.
            local_scan: Latest local scan result, or None.
        """
        if remote_scan is not None:
            self.__context.status.controller.latest_remote_scan_time = remote_scan.timestamp
            self.__context.status.controller.latest_remote_scan_failed = remote_scan.failed
            self.__context.status.controller.latest_remote_scan_error = remote_scan.error_message
        if local_scan is not None:
            self.__context.status.controller.latest_local_scan_time = local_scan.timestamp

    # =========================================================================
    # End of __update_model() helper methods
    # =========================================================================

    def __update_model(self):
        """
        Advance the model state by collecting data from all sources and updating accordingly.

        This method orchestrates the model update process:
        1. Collect scan results, LFTP status, and extract results
        2. Update active file tracking for the active scanner
        3. Feed collected data to the model builder
        4. Build and apply model changes (if any)
        5. Update controller status with scan timestamps

        The actual work is delegated to focused helper methods for maintainability.
        """
        # Step 1: Collect all data from external sources
        latest_remote_scan, latest_local_scan, latest_active_scan = self._collect_scan_results()
        lftp_statuses = self._collect_lftp_status()
        latest_extract_statuses, latest_extracted_results = self._collect_extract_results()

        # Step 2: Update active file tracking
        self._update_active_file_tracking(lftp_statuses, latest_extract_statuses)

        # Step 3: Feed data to model builder
        self._feed_model_builder(
            latest_remote_scan,
            latest_local_scan,
            latest_active_scan,
            lftp_statuses,
            latest_extract_statuses,
            latest_extracted_results
        )

        # Step 4: Build and apply model changes
        self._build_and_apply_model(latest_remote_scan)

        # Step 5: Update controller status
        self._update_controller_status(latest_remote_scan, latest_local_scan)

    def __handle_queue_command(self, file: ModelFile, command: Command) -> (bool, str, int):
        """
        Handle QUEUE command action.
        Returns (success, error_message, error_code) tuple.
        """
        if file.remote_size is None:
            return False, "File '{}' does not exist remotely".format(command.filename), 404
        try:
            self.__lftp.queue(file.name, file.is_dir)
            return True, None, None
        except LftpError as e:
            return False, "Lftp error: {}".format(str(e)), 500

    def __handle_stop_command(self, file: ModelFile, command: Command) -> (bool, str, int):
        """
        Handle STOP command action.
        Returns (success, error_message, error_code) tuple.
        """
        if file.state not in (ModelFile.State.DOWNLOADING, ModelFile.State.QUEUED):
            return False, "File '{}' is not Queued or Downloading".format(command.filename), 409
        try:
            self.__lftp.kill(file.name)
            return True, None, None
        except (LftpError, LftpJobStatusParserError) as e:
            return False, "Lftp error: {}".format(str(e)), 500

    def __handle_extract_command(self, file: ModelFile, command: Command) -> (bool, str, int):
        """
        Handle EXTRACT command action.
        Returns (success, error_message, error_code) tuple.
        """
        # Note: We don't check the is_extractable flag because it's just a guess
        if file.state not in (
                ModelFile.State.DEFAULT,
                ModelFile.State.DOWNLOADED,
                ModelFile.State.EXTRACTED
        ):
            return False, "File '{}' in state {} cannot be extracted".format(
                command.filename, str(file.state)
            ), 409
        elif file.local_size is None:
            return False, "File '{}' does not exist locally".format(command.filename), 404
        else:
            self.__extract_process.extract(file)
            return True, None, None

    def __handle_delete_command(self, file: ModelFile, command: Command) -> (bool, str, int):
        """
        Handle DELETE_LOCAL and DELETE_REMOTE command actions.
        Returns (success, error_message, error_code) tuple.
        """
        if command.action == Controller.Command.Action.DELETE_LOCAL:
            if file.state not in (
                ModelFile.State.DEFAULT,
                ModelFile.State.DOWNLOADED,
                ModelFile.State.EXTRACTED
            ):
                return False, "Local file '{}' cannot be deleted in state {}".format(
                    command.filename, str(file.state)
                ), 409
            elif file.local_size is None:
                return False, "File '{}' does not exist locally".format(command.filename), 404
            else:
                process = DeleteLocalProcess(
                    local_path=self.__context.config.lftp.local_path,
                    file_name=file.name
                )
                process.set_multiprocessing_logger(self.__mp_logger)
                post_callback = self.__local_scan_process.force_scan
                command_wrapper = Controller.CommandProcessWrapper(
                    process=process,
                    post_callback=post_callback
                )
                self.__active_command_processes.append(command_wrapper)
                command_wrapper.process.start()
                return True, None, None

        elif command.action == Controller.Command.Action.DELETE_REMOTE:
            if file.state not in (
                ModelFile.State.DEFAULT,
                ModelFile.State.DOWNLOADED,
                ModelFile.State.EXTRACTED,
                ModelFile.State.DELETED
            ):
                return False, "Remote file '{}' cannot be deleted in state {}".format(
                    command.filename, str(file.state)
                ), 409
            elif file.remote_size is None:
                return False, "File '{}' does not exist remotely".format(command.filename), 404
            else:
                process = DeleteRemoteProcess(
                    remote_address=self.__context.config.lftp.remote_address,
                    remote_username=self.__context.config.lftp.remote_username,
                    remote_password=self.__password,
                    remote_port=self.__context.config.lftp.remote_port,
                    remote_path=self.__context.config.lftp.remote_path,
                    file_name=file.name
                )
                process.set_multiprocessing_logger(self.__mp_logger)
                post_callback = self.__remote_scan_process.force_scan
                command_wrapper = Controller.CommandProcessWrapper(
                    process=process,
                    post_callback=post_callback
                )
                self.__active_command_processes.append(command_wrapper)
                command_wrapper.process.start()
                return True, None, None

        return False, "Unknown delete action", 500

    def __process_commands(self):
        def _notify_failure(_command: Controller.Command, _msg: str, _code: int = 400):
            self.logger.warning("Command failed. {}".format(_msg))
            for _callback in _command.callbacks:
                _callback.on_failure(_msg, _code)

        while not self.__command_queue.empty():
            command = self.__command_queue.get()
            self.logger.info("Received command {} for file {}".format(str(command.action), command.filename))
            try:
                file = self.__model.get_file(command.filename)
            except ModelError:
                _notify_failure(command, "File '{}' not found".format(command.filename), 404)
                continue

            success = False
            error_msg = None
            error_code = 400

            if command.action == Controller.Command.Action.QUEUE:
                success, error_msg, error_code = self.__handle_queue_command(file, command)

            elif command.action == Controller.Command.Action.STOP:
                success, error_msg, error_code = self.__handle_stop_command(file, command)

            elif command.action == Controller.Command.Action.EXTRACT:
                success, error_msg, error_code = self.__handle_extract_command(file, command)

            elif command.action in (Controller.Command.Action.DELETE_LOCAL,
                                    Controller.Command.Action.DELETE_REMOTE):
                success, error_msg, error_code = self.__handle_delete_command(file, command)

            if not success:
                _notify_failure(command, error_msg, error_code)
                continue

            # If we get here, it was a success
            for callback in command.callbacks:
                callback.on_success()

    def __propagate_exceptions(self):
        """
        Propagate any exceptions from child processes/threads to this thread
        :return:
        """
        self.__lftp.raise_pending_error()
        self.__active_scan_process.propagate_exception()
        self.__local_scan_process.propagate_exception()
        self.__remote_scan_process.propagate_exception()
        self.__mp_logger.propagate_exception()
        self.__extract_process.propagate_exception()

    def __cleanup_commands(self):
        """
        Cleanup the list of active commands and do any callbacks
        :return:
        """
        still_active_processes = []
        for command_process in self.__active_command_processes:
            if command_process.process.is_alive():
                still_active_processes.append(command_process)
            else:
                # Do the post callback
                command_process.post_callback()
                # Propagate the exception
                command_process.process.propagate_exception()
        self.__active_command_processes = still_active_processes
