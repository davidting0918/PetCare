"""
Environment configuration and management module.

This module provides centralized environment detection and configuration
management for different deployment environments (test, staging, prod).
"""

import os
from enum import Enum
from pathlib import Path
from typing import Any, Dict, Optional

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv("backend/.env")


class Environment(Enum):
    """Supported deployment environments"""

    TEST = "test"
    STAGING = "staging"
    PRODUCTION = "prod"


class EnvironmentConfig:
    """Environment configuration manager"""

    def __init__(self, environment: Optional[str] = None):
        """
        Initialize environment configuration.

        Args:
            environment (str, optional): Force specific environment.
                                       If None, auto-detect from environment variables.
        """
        self._environment = self._detect_environment(environment)
        self._config = self._load_config()

    def _detect_environment(self, force_env: Optional[str] = None) -> Environment:
        """
        Detect current environment based on environment variables.

        Priority:
        1. force_env parameter (for testing)
        2. PYTEST_RUNNING=1 -> test
        3. APP_ENV environment variable
        4. Default to production

        Args:
            force_env (str, optional): Force specific environment

        Returns:
            Environment: Detected environment
        """
        if force_env:
            return Environment(force_env.lower())

        if os.getenv("PYTEST_RUNNING") == "1":
            return Environment.TEST

        app_env = os.getenv("APP_ENV", "prod").lower()

        # Map common environment names to our enum
        env_mapping = {
            "development": Environment.STAGING,
            "dev": Environment.STAGING,
            "staging": Environment.STAGING,
            "stage": Environment.STAGING,
            "production": Environment.PRODUCTION,
            "prod": Environment.PRODUCTION,
            "test": Environment.TEST,
            "testing": Environment.TEST,
        }

        return env_mapping.get(app_env, Environment.PRODUCTION)

    def _load_config(self) -> Dict[str, Any]:
        """
        Load environment-specific configuration.

        Returns:
            Dict[str, Any]: Environment configuration dictionary
        """
        base_config = {
            "cors_origins": ["http://localhost:3000"],  # Default frontend URL
            "debug": False,
            "log_level": "INFO",
        }

        # Environment-specific configurations
        env_configs = {
            Environment.TEST: {
                "debug": True,
                "log_level": "DEBUG",
                "cors_origins": ["*"],  # Allow all origins in test
                "base_url": "",  # Use relative paths in test
            },
            Environment.STAGING: {
                "debug": True,
                "log_level": "DEBUG",
                "cors_origins": [
                    "http://localhost:3000",
                    "http://localhost:3001",
                    "https://pet-care-lake-six.vercel.app",
                    "http://localhost:5173",
                    "http://localhost:5174",
                ],
                "base_url": os.getenv("STAGING_BASE_URL", ""),  # Can be overridden by env var
            },
            Environment.PRODUCTION: {
                "debug": False,
                "log_level": "INFO",
                "cors_origins": ["https://yourapp.com", "https://www.yourapp.com"],
                "base_url": "",
            },
        }

        # Merge base config with environment-specific config
        config = base_config.copy()
        config.update(env_configs[self._environment])

        return config

    @property
    def environment(self) -> Environment:
        """Get current environment"""
        return self._environment

    @property
    def is_test(self) -> bool:
        """Check if current environment is test"""
        return self._environment == Environment.TEST

    @property
    def is_staging(self) -> bool:
        """Check if current environment is staging"""
        return self._environment == Environment.STAGING

    @property
    def is_production(self) -> bool:
        """Check if current environment is production"""
        return self._environment == Environment.PRODUCTION

    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value by key.

        Args:
            key (str): Configuration key
            default (Any): Default value if key not found

        Returns:
            Any: Configuration value
        """
        return self._config.get(key, default)

    def get_data_path(self, filename: str) -> Path:
        """
        Get path to data file in the data directory.

        Args:
            filename (str): Data filename

        Returns:
            Path: Full path to data file
        """
        current_dir = Path(__file__).parent
        return current_dir / ".." / "data" / filename

    def __str__(self) -> str:
        """String representation"""
        return f"EnvironmentConfig(env={self._environment.value})"

    def __repr__(self) -> str:
        """Detailed representation"""
        return f"EnvironmentConfig(environment={self._environment.value}, config={self._config})"


# Global environment configuration instance
env_config = EnvironmentConfig()


def get_environment() -> Environment:
    """Get current environment enum"""
    return env_config.environment


def get_config(key: str) -> Any:
    """Get configuration value"""
    return env_config.get(key, None)


def is_staging() -> bool:
    """Check if running in staging environment"""
    return env_config.is_staging


def is_production() -> bool:
    """Check if running in production environment"""
    return env_config.is_production


def is_test() -> bool:
    """Check if running in test environment"""
    return env_config.is_test


def get_storage_path() -> str:
    """
    Get base storage path from environment or use default.

    Returns:
        str: Absolute or relative path to storage directory

    Notes:
        - If STORAGE_BASE_PATH env var is set, uses that path (e.g., /var/data/storage on Render)
        - Otherwise uses local development path: backend/storage/
    """
    # Check environment variable first
    storage_path = os.getenv("STORAGE_BASE_PATH")

    if storage_path:
        # Use environment-specified path (for Render: /var/data/storage)
        os.makedirs(storage_path, exist_ok=True)
        return storage_path

    # Default to local development path
    current_dir = Path(__file__).parent
    default_path = current_dir / ".." / "storage"
    default_path.mkdir(exist_ok=True)
    return str(default_path)


def get_photo_storage_path(category: str) -> str:
    """
    Get category-specific photo storage path.

    Args:
        category: Folder name (e.g., 'pet_photos', 'user_photos', 'food_photos')

    Returns:
        str: Full path to category storage directory

    Example:
        >>> get_photo_storage_path("pet_photos")
        '/path/to/backend/storage/pet_photos'
    """
    base_path = get_storage_path()
    category_path = os.path.join(base_path, category)
    os.makedirs(category_path, exist_ok=True)
    return category_path


def get_base_url() -> str:
    """
    Get base URL for generating public-facing URLs (e.g., photo URLs).

    Returns:
        str: Base URL (empty string for relative paths, full URL for absolute paths)

    Examples:
        - Local/Development: "" (returns relative paths like /static/pet_photos/abc.jpg)
        - Production: "https://yourapp.com" (returns https://yourapp.com/static/pet_photos/abc.jpg)
    """
    return env_config.get("base_url", "")


def build_static_url(category: str, filename: str) -> str:
    """
    Build a static file URL based on current environment configuration.

    Args:
        category: Category folder (e.g., 'pet_photos', 'user_photos', 'food_photos')
        filename: File name

    Returns:
        str: Full URL to the static file

    Examples:
        - Local: /static/pet_photos/abc123.jpg
        - Production: https://yourapp.com/static/pet_photos/abc123.jpg
    """
    base_url = get_base_url()
    relative_path = f"/static/{category}/{filename}"

    if base_url:
        # Remove trailing slash from base_url if present
        base_url = base_url.rstrip("/")
        return f"{base_url}{relative_path}"

    return relative_path
