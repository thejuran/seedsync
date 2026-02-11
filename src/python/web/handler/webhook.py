# Copyright 2017, Inderpreet Singh, All rights reserved.

import json
import os
import logging

from bottle import HTTPResponse, request

from common import overrides
from controller.webhook_manager import WebhookManager
from ..web_app import IHandler, WebApp


logger = logging.getLogger(__name__)


class WebhookHandler(IHandler):
    """
    Handles webhook POST requests from Sonarr and Radarr.
    Extracts file names from import events and enqueues them via WebhookManager.
    """

    def __init__(self, webhook_manager: WebhookManager):
        self.__webhook_manager = webhook_manager

    @overrides(IHandler)
    def add_routes(self, web_app: WebApp):
        """Register webhook endpoints."""
        web_app.add_post_handler("/server/webhook/sonarr", self.__handle_sonarr_webhook)
        web_app.add_post_handler("/server/webhook/radarr", self.__handle_radarr_webhook)

    def __handle_sonarr_webhook(self) -> HTTPResponse:
        """Handle Sonarr webhook POST."""
        return self._handle_webhook("Sonarr", WebhookHandler._extract_sonarr_title)

    def __handle_radarr_webhook(self) -> HTTPResponse:
        """Handle Radarr webhook POST."""
        return self._handle_webhook("Radarr", WebhookHandler._extract_radarr_title)

    def _handle_webhook(self, source: str, extract_title_fn) -> HTTPResponse:
        """
        Generic webhook handler for both Sonarr and Radarr.

        Args:
            source: Source service name ("Sonarr" or "Radarr")
            extract_title_fn: Function to extract title from request body

        Returns:
            HTTPResponse with appropriate status code
        """
        # Parse JSON body
        try:
            body = request.json
        except Exception:
            return HTTPResponse(status=400, body="Invalid JSON")

        if not body:
            return HTTPResponse(status=400, body="Empty body")

        # Extract event type
        event_type = body.get("eventType", "")

        # Handle Test events (sent when webhook is first configured)
        if event_type == "Test":
            logger.info("{} webhook test event received".format(source))
            return HTTPResponse(status=200, body="Test OK")

        # Only process Download (import) events
        if event_type != "Download":
            logger.debug("{} webhook ignored event type: {}".format(source, event_type))
            return HTTPResponse(status=200, body="OK")

        # Extract title
        title = extract_title_fn(body)
        if not title:
            logger.debug("{} webhook Download event has no extractable title".format(source))
            return HTTPResponse(status=200, body="OK")

        # Enqueue import
        self.__webhook_manager.enqueue_import(source, title)
        return HTTPResponse(status=200, body="OK")

    @staticmethod
    def _extract_sonarr_title(body: dict) -> str:
        """
        Extract title from Sonarr webhook body.
        Fallback chain: episodeFile.sourcePath (basename) -> release.releaseTitle -> series.title

        Args:
            body: Parsed JSON body from Sonarr webhook

        Returns:
            Extracted title or empty string if none found
        """
        # Try episodeFile.sourcePath (most accurate - actual file name)
        episode_file = body.get("episodeFile", {})
        source_path = episode_file.get("sourcePath", "")
        if source_path:
            return os.path.basename(source_path)

        # Fallback to release.releaseTitle
        release = body.get("release", {})
        release_title = release.get("releaseTitle", "")
        if release_title:
            return release_title

        # Fallback to series.title (least accurate)
        series = body.get("series", {})
        series_title = series.get("title", "")
        if series_title:
            return series_title

        return ""

    @staticmethod
    def _extract_radarr_title(body: dict) -> str:
        """
        Extract title from Radarr webhook body.
        Fallback chain: movieFile.sourcePath (basename) -> release.releaseTitle -> movie.title

        Args:
            body: Parsed JSON body from Radarr webhook

        Returns:
            Extracted title or empty string if none found
        """
        # Try movieFile.sourcePath (most accurate - actual file name)
        movie_file = body.get("movieFile", {})
        source_path = movie_file.get("sourcePath", "")
        if source_path:
            return os.path.basename(source_path)

        # Fallback to release.releaseTitle
        release = body.get("release", {})
        release_title = release.get("releaseTitle", "")
        if release_title:
            return release_title

        # Fallback to movie.title (least accurate)
        movie = body.get("movie", {})
        movie_title = movie.get("title", "")
        if movie_title:
            return movie_title

        return ""
