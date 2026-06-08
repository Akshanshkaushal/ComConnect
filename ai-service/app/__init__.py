from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException

from .config import Config
from .routes import api


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    app.register_blueprint(api, url_prefix="/v1")

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        if isinstance(error, HTTPException):
            return jsonify({"message": error.description}), error.code
        app.logger.exception("Unhandled AI service error")
        return jsonify({"message": str(error)}), 500

    return app
