# Copyright 2017, Inderpreet Singh, All rights reserved.

import json
from threading import Event
from urllib.parse import unquote

from bottle import HTTPResponse, request

from common import overrides
from controller import Controller
from ..web_app import IHandler, WebApp


class WebResponseActionCallback(Controller.Command.ICallback):
    """
    Controller action callback used by model streams to wait for action
    status.
    Clients should call wait() method to wait for the status,
    then query the status from 'success', 'error', and 'error_code'
    """

    def __init__(self):
        self.__event = Event()
        self.success = None
        self.error = None
        self.error_code = 400

    @overrides(Controller.Command.ICallback)
    def on_failure(self, error: str, error_code: int = 400):
        self.success = False
        self.error = error
        self.error_code = error_code
        self.__event.set()

    @overrides(Controller.Command.ICallback)
    def on_success(self):
        self.success = True
        self.__event.set()

    def wait(self):
        self.__event.wait()


class ControllerHandler(IHandler):
    def __init__(self, controller: Controller):
        self.__controller = controller

    @overrides(IHandler)
    def add_routes(self, web_app: WebApp):
        web_app.add_handler("/server/command/queue/<file_name>", self.__handle_action_queue)
        web_app.add_handler("/server/command/stop/<file_name>", self.__handle_action_stop)
        web_app.add_handler("/server/command/extract/<file_name>", self.__handle_action_extract)
        web_app.add_handler("/server/command/delete_local/<file_name>", self.__handle_action_delete_local)
        web_app.add_handler("/server/command/delete_remote/<file_name>", self.__handle_action_delete_remote)
        web_app.add_post_handler("/server/command/bulk", self.__handle_bulk_command)

    def __handle_action_queue(self, file_name: str):
        """
        Request a QUEUE action
        :param file_name:
        :return:
        """
        # value is double encoded
        file_name = unquote(file_name)

        command = Controller.Command(Controller.Command.Action.QUEUE, file_name)
        callback = WebResponseActionCallback()
        command.add_callback(callback)
        self.__controller.queue_command(command)
        callback.wait()
        if callback.success:
            return HTTPResponse(body="Queued file '{}'".format(file_name))
        else:
            return HTTPResponse(body=callback.error, status=callback.error_code)

    def __handle_action_stop(self, file_name: str):
        """
        Request a STOP action
        :param file_name:
        :return:
        """
        # value is double encoded
        file_name = unquote(file_name)

        command = Controller.Command(Controller.Command.Action.STOP, file_name)
        callback = WebResponseActionCallback()
        command.add_callback(callback)
        self.__controller.queue_command(command)
        callback.wait()
        if callback.success:
            return HTTPResponse(body="Stopped file '{}'".format(file_name))
        else:
            return HTTPResponse(body=callback.error, status=callback.error_code)

    def __handle_action_extract(self, file_name: str):
        """
        Request a EXTRACT action
        :param file_name:
        :return:
        """
        # value is double encoded
        file_name = unquote(file_name)

        command = Controller.Command(Controller.Command.Action.EXTRACT, file_name)
        callback = WebResponseActionCallback()
        command.add_callback(callback)
        self.__controller.queue_command(command)
        callback.wait()
        if callback.success:
            return HTTPResponse(body="Requested extraction for file '{}'".format(file_name))
        else:
            return HTTPResponse(body=callback.error, status=callback.error_code)

    def __handle_action_delete_local(self, file_name: str):
        """
        Request a DELETE LOCAL action
        :param file_name:
        :return:
        """
        # value is double encoded
        file_name = unquote(file_name)

        command = Controller.Command(Controller.Command.Action.DELETE_LOCAL, file_name)
        callback = WebResponseActionCallback()
        command.add_callback(callback)
        self.__controller.queue_command(command)
        callback.wait()
        if callback.success:
            return HTTPResponse(body="Requested local delete for file '{}'".format(file_name))
        else:
            return HTTPResponse(body=callback.error, status=callback.error_code)

    def __handle_action_delete_remote(self, file_name: str):
        """
        Request a DELETE REMOTE action
        :param file_name:
        :return:
        """
        # value is double encoded
        file_name = unquote(file_name)

        command = Controller.Command(Controller.Command.Action.DELETE_REMOTE, file_name)
        callback = WebResponseActionCallback()
        command.add_callback(callback)
        self.__controller.queue_command(command)
        callback.wait()
        if callback.success:
            return HTTPResponse(body="Requested remote delete for file '{}'".format(file_name))
        else:
            return HTTPResponse(body=callback.error, status=callback.error_code)

    # Valid action names for the bulk endpoint
    _VALID_ACTIONS = {
        "queue": Controller.Command.Action.QUEUE,
        "stop": Controller.Command.Action.STOP,
        "extract": Controller.Command.Action.EXTRACT,
        "delete_local": Controller.Command.Action.DELETE_LOCAL,
        "delete_remote": Controller.Command.Action.DELETE_REMOTE,
    }

    def __handle_bulk_command(self):
        """
        Handle bulk command requests for multiple files.

        Expected JSON body:
        {
            "action": "queue|stop|extract|delete_local|delete_remote",
            "files": ["file1", "file2", ...]
        }

        Returns JSON:
        {
            "results": [
                {"file": "file1", "success": true},
                {"file": "file2", "success": false, "error": "error message", "error_code": 404}
            ],
            "summary": {
                "total": 2,
                "succeeded": 1,
                "failed": 1
            }
        }
        """
        # Parse JSON body
        try:
            body = request.json
        except Exception:
            return HTTPResponse(
                body=json.dumps({"error": "Invalid JSON body"}),
                status=400,
                content_type="application/json"
            )

        if not body:
            return HTTPResponse(
                body=json.dumps({"error": "Request body is required"}),
                status=400,
                content_type="application/json"
            )

        # Validate action
        action_name = body.get("action")
        if not action_name or action_name not in self._VALID_ACTIONS:
            valid_actions = ", ".join(self._VALID_ACTIONS.keys())
            return HTTPResponse(
                body=json.dumps({
                    "error": "Invalid action '{}'. Valid actions: {}".format(action_name, valid_actions)
                }),
                status=400,
                content_type="application/json"
            )

        # Validate files array
        files = body.get("files")
        if not files:
            return HTTPResponse(
                body=json.dumps({"error": "files array is required and must not be empty"}),
                status=400,
                content_type="application/json"
            )
        if not isinstance(files, list):
            return HTTPResponse(
                body=json.dumps({"error": "files must be an array"}),
                status=400,
                content_type="application/json"
            )
        if not all(isinstance(f, str) for f in files):
            return HTTPResponse(
                body=json.dumps({"error": "All files must be strings"}),
                status=400,
                content_type="application/json"
            )

        action = self._VALID_ACTIONS[action_name]
        results = []
        succeeded = 0
        failed = 0

        # Process each file
        for file_name in files:
            command = Controller.Command(action, file_name)
            callback = WebResponseActionCallback()
            command.add_callback(callback)
            self.__controller.queue_command(command)
            callback.wait()

            if callback.success:
                results.append({
                    "file": file_name,
                    "success": True
                })
                succeeded += 1
            else:
                results.append({
                    "file": file_name,
                    "success": False,
                    "error": callback.error,
                    "error_code": callback.error_code
                })
                failed += 1

        response = {
            "results": results,
            "summary": {
                "total": len(files),
                "succeeded": succeeded,
                "failed": failed
            }
        }

        return HTTPResponse(
            body=json.dumps(response),
            status=200,
            content_type="application/json"
        )
