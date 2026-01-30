# Copyright 2017, Inderpreet Singh, All rights reserved.

import json
import threading
from abc import ABC, abstractmethod
from typing import Set, List, Callable, Tuple
import fnmatch

from common import overrides, Constants, Context, Persist, PersistError, Serializable
from model import IModelListener, ModelFile
from .controller import Controller


class AutoQueuePattern(Serializable):
    # Keys
    __KEY_PATTERN = "pattern"

    def __init__(self, pattern: str):
        self.__pattern = pattern

    @property
    def pattern(self) -> str:
        return self.__pattern

    def __eq__(self, other: "AutoQueuePattern") -> bool:
        return self.__pattern == other.__pattern

    def __hash__(self) -> int:
        return hash(self.__pattern)

    def to_str(self) -> str:
        dct = dict()
        dct[AutoQueuePattern.__KEY_PATTERN] = self.__pattern
        return json.dumps(dct)

    @classmethod
    def from_str(cls, content: str) -> "AutoQueuePattern":
        dct = json.loads(content)
        return AutoQueuePattern(pattern=dct[AutoQueuePattern.__KEY_PATTERN])


class IAutoQueuePersistListener(ABC):
    """Listener for receiving AutoQueuePersist events"""

    @abstractmethod
    def pattern_added(self, pattern: AutoQueuePattern):
        pass

    @abstractmethod
    def pattern_removed(self, pattern: AutoQueuePattern):
        pass


class AutoQueuePersist(Persist):
    """
    Persisting state for auto-queue

    Thread-safety: Listener operations are protected by __listeners_lock.
    The copy-under-lock pattern is used when notifying listeners to prevent
    race conditions with concurrent add/remove operations.
    """

    # Keys
    __KEY_PATTERNS = "patterns"

    def __init__(self):
        self.__patterns = []
        self.__listeners = []
        self.__listeners_lock = threading.Lock()

    @property
    def patterns(self) -> Set[AutoQueuePattern]:
        return set(self.__patterns)

    def add_pattern(self, pattern: AutoQueuePattern):
        # Check values
        if not pattern.pattern.strip():
            raise ValueError("Cannot add blank pattern")

        if pattern not in self.__patterns:
            self.__patterns.append(pattern)
            # Copy-under-lock: copy listeners while holding lock, then iterate outside lock
            with self.__listeners_lock:
                listeners = list(self.__listeners)
            for listener in listeners:
                listener.pattern_added(pattern)

    def remove_pattern(self, pattern: AutoQueuePattern):
        if pattern in self.__patterns:
            self.__patterns.remove(pattern)
            # Copy-under-lock: copy listeners while holding lock, then iterate outside lock
            with self.__listeners_lock:
                listeners = list(self.__listeners)
            for listener in listeners:
                listener.pattern_removed(pattern)

    def add_listener(self, listener: IAutoQueuePersistListener):
        with self.__listeners_lock:
            self.__listeners.append(listener)

    @classmethod
    @overrides(Persist)
    def from_str(cls: "AutoQueuePersist", content: str) -> "AutoQueuePersist":
        persist = AutoQueuePersist()
        try:
            dct = json.loads(content)
            pattern_list = dct[AutoQueuePersist.__KEY_PATTERNS]
            for pattern in pattern_list:
                persist.add_pattern(AutoQueuePattern.from_str(pattern))
            return persist
        except (json.decoder.JSONDecodeError, KeyError) as e:
            raise PersistError("Error parsing AutoQueuePersist - {}: {}".format(
                type(e).__name__, str(e))
            )

    @overrides(Persist)
    def to_str(self) -> str:
        dct = dict()
        dct[AutoQueuePersist.__KEY_PATTERNS] = list(p.to_str() for p in self.__patterns)
        return json.dumps(dct, indent=Constants.JSON_PRETTY_PRINT_INDENT)


class AutoQueueModelListener(IModelListener):
    """Keeps track of added and modified files"""
    def __init__(self):
        self.new_files = []  # list of new files
        self.modified_files = []  # list of pairs (old_file, new_file)

    @overrides(IModelListener)
    def file_added(self, file: ModelFile):
        self.new_files.append(file)

    @overrides(IModelListener)
    def file_updated(self, old_file: ModelFile, new_file: ModelFile):
        self.modified_files.append((old_file, new_file))

    @overrides(IModelListener)
    def file_removed(self, file: ModelFile):
        pass


class AutoQueuePersistListener(IAutoQueuePersistListener):
    """Keeps track of newly added patterns"""
    def __init__(self):
        self.new_patterns = set()

    @overrides(IAutoQueuePersistListener)
    def pattern_added(self, pattern: AutoQueuePattern):
        self.new_patterns.add(pattern)

    @overrides(IAutoQueuePersistListener)
    def pattern_removed(self, pattern: AutoQueuePattern):
        if pattern in self.new_patterns:
            self.new_patterns.remove(pattern)


class AutoQueue:
    """
    Implements auto-queue functionality by sending commands to controller
    as matching files are discovered
    AutoQueue is in the same thread as Controller, so no synchronization is
    needed for now
    """
    def __init__(self,
                 context: Context,
                 persist: AutoQueuePersist,
                 controller: Controller):
        self.logger = context.logger.getChild("AutoQueue")
        self.__persist = persist
        self.__controller = controller
        self.__model_listener = AutoQueueModelListener()
        self.__persist_listener = AutoQueuePersistListener()
        self.__enabled = context.config.autoqueue.enabled
        self.__patterns_only = context.config.autoqueue.patterns_only
        self.__auto_extract_enabled = context.config.autoqueue.auto_extract

        if self.__enabled:
            persist.add_listener(self.__persist_listener)

            initial_model_files = self.__controller.get_model_files_and_add_listener(self.__model_listener)
            # pass the initial model files through to our listener
            for file in initial_model_files:
                self.__model_listener.file_added(file)

            # Print the initial persist state
            self.logger.debug("Auto-Queue Patterns:")
            for pattern in self.__persist.patterns:
                self.logger.debug("    {}".format(pattern.pattern))

    def process(self):
        """
        Advance the auto queue state
        :return:
        """
        if not self.__enabled:
            return

        ###
        # Queue
        ###
        # Process new files separately from modified files to apply different filtering:
        # - New files: don't queue if local_size > 0 (STOPPED files shouldn't restart on app startup)
        # - Modified files (remote_size changed): queue regardless of local_size (legitimate update)

        # Filter new files: only queue if no local content (prevents STOPPED files from being re-queued)
        new_files_to_queue = self.__filter_candidates(
            candidates=self.__model_listener.new_files,
            accept=lambda f: (f.remote_size is not None and
                              f.state == ModelFile.State.DEFAULT and
                              (f.local_size is None or f.local_size == 0))
        )

        # Filter modified files where remote size changed: allow regardless of local_size
        # This handles legitimate scenarios like remote file updates or discovering a remote
        # for a partial local file
        modified_candidates = []
        for old_file, new_file in self.__model_listener.modified_files:
            if old_file.remote_size != new_file.remote_size:
                modified_candidates.append(new_file)

        modified_files_to_queue = self.__filter_candidates(
            candidates=modified_candidates,
            accept=lambda f: f.remote_size is not None and f.state == ModelFile.State.DEFAULT
        )

        # Combine results, avoiding duplicates by using dict keyed on filename
        files_to_queue_dict = {name: pattern for name, pattern in new_files_to_queue}
        for name, pattern in modified_files_to_queue:
            if name not in files_to_queue_dict:
                files_to_queue_dict[name] = pattern
        files_to_queue = list(files_to_queue_dict.items())

        ###
        # Extract
        ###
        files_to_extract = []

        if self.__auto_extract_enabled:
            extract_candidate_files = []

            # Candidate all new files
            extract_candidate_files += self.__model_listener.new_files

            # Candidate modified files that just became DOWNLOADED
            # But not files that went EXTRACTING -> DOWNLOADED (failed extraction)
            for old_file, new_file in self.__model_listener.modified_files:
                if old_file.state != ModelFile.State.DOWNLOADED and \
                        old_file.state != ModelFile.State.EXTRACTING and \
                        new_file.state == ModelFile.State.DOWNLOADED:
                    extract_candidate_files.append(new_file)

            files_to_extract = self.__filter_candidates(
                candidates=extract_candidate_files,
                accept=lambda f:
                    f.state == ModelFile.State.DOWNLOADED and
                    f.local_size is not None and
                    f.local_size > 0 and
                    f.is_extractable
            )

        ###
        # Send commands
        ###

        # Send the queue commands
        for filename, pattern in files_to_queue:
            self.logger.info(
                "Auto queueing '{}'".format(filename) +
                (" for pattern '{}'".format(pattern.pattern) if pattern else "")
            )
            command = Controller.Command(Controller.Command.Action.QUEUE, filename)
            self.__controller.queue_command(command)

        # Send the extract commands
        for filename, pattern in files_to_extract:
            self.logger.info(
                "Auto extracting '{}'".format(filename) +
                (" for pattern '{}'".format(pattern.pattern) if pattern else "")
            )
            command = Controller.Command(Controller.Command.Action.EXTRACT, filename)
            self.__controller.queue_command(command)

        # Clear the processed files
        self.__model_listener.new_files.clear()
        self.__model_listener.modified_files.clear()
        # Clear the new patterns
        self.__persist_listener.new_patterns.clear()

    def __filter_candidates(self,
                            candidates: List[ModelFile],
                            accept: Callable[[ModelFile], bool]) -> List[Tuple[str, AutoQueuePattern]]:
        """
        Given a list of candidate files, filter out those that match the accept criteria
        Also takes into consideration new patterns that were added
        The accept criteria is applied to candidates AND all existing files in case of
        new patterns
        :param candidates:
        :param accept:
        :return: list of (filename, pattern) pairs
        """
        # Files accepted and matched, filename -> pattern map
        # Filename key prevents a file from being accepted twice
        files_matched = dict()

        # Step 1: run candidates through all the patterns if they are enabled
        #         otherwise accept all files
        for file in candidates:
            if self.__patterns_only:
                for pattern in self.__persist.patterns:
                    if accept(file) and self.__match(pattern, file):
                        files_matched[file.name] = pattern
                        break
            elif accept(file):
                files_matched[file.name] = None

        # Step 2: run new pattern through all the files
        if self.__persist_listener.new_patterns:
            model_files = self.__controller.get_model_files()
            for new_pattern in self.__persist_listener.new_patterns:
                for file in model_files:
                    if accept(file) and self.__match(new_pattern, file):
                        files_matched[file.name] = new_pattern

        return list(zip(files_matched.keys(), files_matched.values()))

    @staticmethod
    def __match(pattern: AutoQueuePattern, file: ModelFile) -> bool:
        """
        Returns true is file matches the pattern
        :param pattern:
        :param file:
        :return:
        """
        # make the search case insensitive
        pattern = pattern.pattern.lower()
        filename = file.name.lower()
        # 1. pattern match
        # 2. wildcard match
        return pattern in filename or \
            fnmatch.fnmatch(filename, pattern)
