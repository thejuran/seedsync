# Copyright 2017, Inderpreet Singh, All rights reserved.

import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.parse import quote

import requests

from common import Config, ConfigError
from web.handler.config import ConfigHandler


class TestConfigHandlerGet(unittest.TestCase):
    def setUp(self):
        self.mock_config = MagicMock()
        self.handler = ConfigHandler(self.mock_config)

    @patch('web.handler.config.SerializeConfig')
    def test_get_returns_200(self, mock_serialize_cls):
        mock_serialize_cls.config.return_value = '{"test":"data"}'
        response = self.handler._ConfigHandler__handle_get_config()
        self.assertEqual(200, response.status_code)

    @patch('web.handler.config.SerializeConfig')
    def test_get_body_is_serialized_config(self, mock_serialize_cls):
        mock_serialize_cls.config.return_value = '{"test":"data"}'
        response = self.handler._ConfigHandler__handle_get_config()
        self.assertEqual('{"test":"data"}', response.body)


class TestConfigHandlerSet(unittest.TestCase):
    def setUp(self):
        self.mock_config = MagicMock()
        self.handler = ConfigHandler(self.mock_config)

    def test_set_valid_returns_200(self):
        self.mock_config.has_section.return_value = True
        mock_inner = MagicMock()
        mock_inner.has_property.return_value = True
        self.mock_config.lftp = mock_inner
        response = self.handler._ConfigHandler__handle_set_config("lftp", "remote_address", quote("192.168.1.1"))
        self.assertEqual(200, response.status_code)

    def test_set_calls_set_property(self):
        self.mock_config.has_section.return_value = True
        mock_inner = MagicMock()
        mock_inner.has_property.return_value = True
        self.mock_config.lftp = mock_inner
        self.handler._ConfigHandler__handle_set_config("lftp", "remote_address", quote("192.168.1.1"))
        mock_inner.set_property.assert_called_once_with("remote_address", "192.168.1.1")

    def test_set_missing_section_returns_404(self):
        self.mock_config.has_section.return_value = False
        response = self.handler._ConfigHandler__handle_set_config("nosection", "key", quote("value"))
        self.assertEqual(404, response.status_code)
        self.assertIn("no section", response.body.lower())

    def test_set_missing_key_returns_404(self):
        self.mock_config.has_section.return_value = True
        mock_inner = MagicMock()
        mock_inner.has_property.return_value = False
        self.mock_config.nosection = mock_inner
        response = self.handler._ConfigHandler__handle_set_config("nosection", "badkey", quote("value"))
        self.assertEqual(404, response.status_code)
        self.assertIn("no option", response.body.lower())

    def test_set_config_error_returns_400(self):
        self.mock_config.has_section.return_value = True
        mock_inner = MagicMock()
        mock_inner.has_property.return_value = True
        mock_inner.set_property.side_effect = ConfigError("Invalid")
        self.mock_config.lftp = mock_inner
        response = self.handler._ConfigHandler__handle_set_config("lftp", "remote_address", quote("bad"))
        self.assertEqual(400, response.status_code)

    def test_set_url_decodes_value(self):
        self.mock_config.has_section.return_value = True
        mock_inner = MagicMock()
        mock_inner.has_property.return_value = True
        self.mock_config.lftp = mock_inner
        self.handler._ConfigHandler__handle_set_config("lftp", "remote_path", quote("/path/with spaces"))
        mock_inner.set_property.assert_called_once_with("remote_path", "/path/with spaces")

    def test_set_value_with_slashes(self):
        self.mock_config.has_section.return_value = True
        mock_inner = MagicMock()
        mock_inner.has_property.return_value = True
        self.mock_config.lftp = mock_inner
        self.handler._ConfigHandler__handle_set_config("lftp", "remote_path", quote("/remote/path/to/dir"))
        mock_inner.set_property.assert_called_once_with("remote_path", "/remote/path/to/dir")


class TestConfigHandlerTestRadarrConnection(unittest.TestCase):
    def setUp(self):
        self.config = Config()
        self.config.radarr.enabled = False
        self.config.radarr.radarr_url = "http://localhost:7878"
        self.config.radarr.radarr_api_key = "testapikey123"
        self.handler = ConfigHandler(self.config)

    def test_radarr_missing_url_returns_error(self):
        self.config.radarr.radarr_url = ""
        response = self.handler._ConfigHandler__handle_test_radarr_connection()
        body = json.loads(response.body)
        self.assertFalse(body["success"])
        self.assertEqual("Radarr URL is required", body["error"])

    def test_radarr_missing_api_key_returns_error(self):
        self.config.radarr.radarr_api_key = ""
        response = self.handler._ConfigHandler__handle_test_radarr_connection()
        body = json.loads(response.body)
        self.assertFalse(body["success"])
        self.assertEqual("Radarr API key is required", body["error"])

    @patch('web.handler.config.requests')
    def test_radarr_success_returns_version(self, mock_requests):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"version": "5.0.0"}
        mock_requests.get.return_value = mock_response
        mock_requests.ConnectionError = requests.ConnectionError
        mock_requests.Timeout = requests.Timeout

        response = self.handler._ConfigHandler__handle_test_radarr_connection()
        body = json.loads(response.body)
        self.assertTrue(body["success"])
        self.assertEqual("5.0.0", body["version"])

    @patch('web.handler.config.requests')
    def test_radarr_401_returns_invalid_key(self, mock_requests):
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_requests.get.return_value = mock_response
        mock_requests.ConnectionError = requests.ConnectionError
        mock_requests.Timeout = requests.Timeout

        response = self.handler._ConfigHandler__handle_test_radarr_connection()
        body = json.loads(response.body)
        self.assertFalse(body["success"])
        self.assertEqual("Invalid API key", body["error"])

    @patch('web.handler.config.requests')
    def test_radarr_connection_error(self, mock_requests):
        mock_requests.get.side_effect = requests.ConnectionError("Connection refused")
        mock_requests.ConnectionError = requests.ConnectionError
        mock_requests.Timeout = requests.Timeout

        response = self.handler._ConfigHandler__handle_test_radarr_connection()
        body = json.loads(response.body)
        self.assertFalse(body["success"])
        self.assertIn("Connection refused", body["error"])

    @patch('web.handler.config.requests')
    def test_radarr_timeout(self, mock_requests):
        mock_requests.get.side_effect = requests.Timeout("Connection timed out")
        mock_requests.ConnectionError = requests.ConnectionError
        mock_requests.Timeout = requests.Timeout

        response = self.handler._ConfigHandler__handle_test_radarr_connection()
        body = json.loads(response.body)
        self.assertFalse(body["success"])
        self.assertEqual("Connection timed out", body["error"])

    @patch('web.handler.config.requests')
    def test_radarr_strips_trailing_slash(self, mock_requests):
        self.config.radarr.radarr_url = "http://localhost:7878/"
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"version": "5.0.0"}
        mock_requests.get.return_value = mock_response
        mock_requests.ConnectionError = requests.ConnectionError
        mock_requests.Timeout = requests.Timeout

        self.handler._ConfigHandler__handle_test_radarr_connection()
        mock_requests.get.assert_called_once_with(
            "http://localhost:7878/api/v3/system/status",
            headers={"X-Api-Key": "testapikey123"},
            timeout=10
        )
