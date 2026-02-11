# Copyright 2017, Inderpreet Singh, All rights reserved.

from queue import Queue
from typing import List, Set

from common import Context


class WebhookManager:
    """
    Manages webhook-triggered import events via thread-safe queue.

    Responsible for:
    - Receiving import events from web server thread via enqueue_import()
    - Processing queued events in controller thread via process()
    - Matching imported file names against SeedSync model
    - Reporting newly imported files

    Thread-safety: Queue is thread-safe. enqueue_import() called from web
    thread, process() called from controller thread.
    """

    def __init__(self, context: Context):
        self.__context = context
        self.logger = context.logger.getChild("WebhookManager")
        self.__import_queue = Queue()

    def enqueue_import(self, source: str, file_name: str):
        """
        Enqueue an import event from webhook.
        Called from web server thread.

        Args:
            source: Source service ("Sonarr" or "Radarr")
            file_name: Name of the imported file
        """
        self.__import_queue.put((source, file_name))
        self.logger.info("{} webhook import enqueued: '{}'".format(source, file_name))

    def process(self, model_file_names: Set[str]) -> List[str]:
        """
        Process queued import events and match against SeedSync model.
        Called from controller thread each cycle.

        Args:
            model_file_names: Set of ModelFile.name values currently in the model

        Returns:
            List of SeedSync model file names that were imported
        """
        # Build case-insensitive lookup dict
        model_file_names_lower = {name.lower(): name for name in model_file_names}

        newly_imported = []

        # Drain queue
        while not self.__import_queue.empty():
            try:
                source, file_name = self.__import_queue.get_nowait()
            except:
                # Queue empty (race condition between empty() and get_nowait())
                break

            # Case-insensitive matching
            original_name = model_file_names_lower.get(file_name.lower())
            if original_name is not None:
                newly_imported.append(original_name)
                self.logger.info(
                    "{} import detected: '{}' (matched SeedSync file '{}')".format(
                        source, file_name, original_name
                    )
                )
            else:
                self.logger.debug(
                    "{} webhook file '{}' not in SeedSync model".format(
                        source, file_name
                    )
                )

        return newly_imported
