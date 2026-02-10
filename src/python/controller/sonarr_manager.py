# Copyright 2017, Inderpreet Singh, All rights reserved.

import logging
import time
from typing import Optional, List, Set, Dict

import requests

from common import Context


class SonarrManager:
    """
    Manages Sonarr queue polling and import detection.

    Responsible for:
    - Polling Sonarr queue API at configured intervals
    - Tracking which queue items correspond to SeedSync files
    - Detecting when files disappear from queue (import completion)
    - Detecting when queue items transition to imported state
    - Reporting newly imported files

    Thread-safety: Called only from the controller thread (via process()),
    so no synchronization needed for internal state. The requests library
    is thread-safe for independent sessions.
    """

    POLL_INTERVAL_SECS = 60

    def __init__(self, context: Context):
        self.__context = context
        self.logger = context.logger.getChild("SonarrManager")
        self.__last_poll_time = None  # float timestamp, None means never polled
        # None means first poll not done yet; this is CRITICAL for first-poll
        # bootstrap -- None is different from empty set
        self.__previous_queue_names = None
        self.__previous_queue_states = {}  # dict mapping title -> trackedDownloadState

    def process(self, model_file_names: Set[str]) -> List[str]:
        """
        Called each controller cycle. Polls Sonarr if interval elapsed.
        Returns list of newly imported file names (empty most cycles).
        model_file_names: set of ModelFile.name values currently in the model.
        """
        # Re-read config each call so toggling in settings takes effect without restart
        if not self.__context.config.sonarr.enabled:
            return []

        now = time.time()
        if self.__last_poll_time is not None and (now - self.__last_poll_time) < self.POLL_INTERVAL_SECS:
            return []

        self.__last_poll_time = now
        return self._poll_and_detect(model_file_names)

    def _fetch_queue(self) -> Optional[List[dict]]:
        """
        Fetch current Sonarr queue. Returns list of records or None on error.
        CRITICAL: Returns None on error, NOT empty list, to prevent false positive
        import detection.
        """
        url = self.__context.config.sonarr.sonarr_url
        api_key = self.__context.config.sonarr.sonarr_api_key
        url = url.rstrip("/")
        try:
            response = requests.get(
                "{}/api/v3/queue".format(url),
                headers={"X-Api-Key": api_key},
                params={
                    "pageSize": 200,
                    "includeUnknownSeriesItems": True,
                },
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("records", [])
            else:
                self.logger.warning(
                    "Sonarr queue API returned status {}".format(response.status_code)
                )
                return None
        except requests.RequestException as e:
            self.logger.warning("Sonarr queue API error: {}".format(str(e)))
            return None

    def _poll_and_detect(self, model_file_names: Set[str]) -> List[str]:
        """
        Poll Sonarr queue and detect newly imported files.
        Returns list of SeedSync model file names that were imported.
        """
        records = self._fetch_queue()
        if records is None:
            self.logger.debug("Sonarr poll skipped due to API error")
            return []

        # Build current state
        current_queue_names = set()
        current_queue_states = {}
        for record in records:
            title = record.get("title", "")
            current_queue_names.add(title)
            current_queue_states[title] = record.get("trackedDownloadState", "")

        self.logger.debug("Sonarr queue poll: {} items in queue".format(len(records)))

        # First-poll bootstrap
        if self.__previous_queue_names is None:
            self.__previous_queue_names = current_queue_names
            self.__previous_queue_states = current_queue_states
            self.logger.info(
                "Sonarr initial poll: {} items in queue (bootstrap, no detection)".format(
                    len(records)
                )
            )
            return []

        # Detect imports via disappearance
        disappeared = self.__previous_queue_names - current_queue_names

        # Detect imports via state change to "imported"
        state_changed = set()
        for title, state in current_queue_states.items():
            if state == "imported":
                prev_state = self.__previous_queue_states.get(title, "")
                if prev_state != "imported":
                    state_changed.add(title)

        # Combine detections
        all_detected = disappeared | state_changed

        # Filter to SeedSync-managed files (case-insensitive matching)
        model_file_names_lower = {name.lower(): name for name in model_file_names}
        newly_imported = []
        for detected_name in all_detected:
            original_name = model_file_names_lower.get(detected_name.lower())
            if original_name is not None:
                newly_imported.append(original_name)
                self.logger.info(
                    "Sonarr import detected: '{}' (matched SeedSync file '{}')".format(
                        detected_name, original_name
                    )
                )
            else:
                self.logger.debug(
                    "Sonarr queue item '{}' disappeared but not in SeedSync model".format(
                        detected_name
                    )
                )

        # Update previous state
        self.__previous_queue_names = current_queue_names
        self.__previous_queue_states = current_queue_states

        return newly_imported
