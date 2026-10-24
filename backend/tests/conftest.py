"""
Shared pytest fixtures and configuration.
"""

import pytest
from app.registry import load_registry
from app.main import registry as _registry_module


@pytest.fixture(scope="session", autouse=True)
def preload_registry():
    """
    Load and pre-populate the global registry once for the entire test session.
    This avoids repeated disk reads and keeps test runs fast.
    """
    loaded = load_registry()
    _registry_module._brands = loaded._brands
    _registry_module._domain_to_brand = loaded._domain_to_brand
    _registry_module._private_key = loaded._private_key
    _registry_module._public_key = loaded._public_key
    return _registry_module
