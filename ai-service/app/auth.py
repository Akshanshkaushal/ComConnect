import hmac

from flask import current_app, jsonify, request


def require_service_token(handler):
    def wrapped(*args, **kwargs):
        expected = current_app.config["AI_SERVICE_TOKEN"]
        provided = request.headers.get("X-Service-Token", "")
        if not expected or not hmac.compare_digest(provided, expected):
            return jsonify({"message": "Invalid service token"}), 401
        return handler(*args, **kwargs)

    wrapped.__name__ = handler.__name__
    return wrapped
