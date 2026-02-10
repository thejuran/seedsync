from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import RedirectResponse
from starlette.staticfiles import StaticFiles


class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as ex:
            if ex.status_code == 404:
                # API paths: redirect to trailing-slash version so FastAPI
                # router can match them (mirrors redirect_slashes behavior
                # that the mount otherwise intercepts).
                if path.startswith("api/") or path == "api":
                    request_path = scope.get("path", "")
                    if not request_path.endswith("/"):
                        return RedirectResponse(url=request_path + "/")
                    raise
                return await super().get_response("index.html", scope)
            raise
