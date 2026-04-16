"""
Pytest conftest for Vision GridAI Python unit tests.

Adds the execution/ directory to sys.path so that
generate_kinetic_ass and other modules can be imported directly.
"""

import sys
import os

# Add the execution/ directory to the import path
EXECUTION_DIR = os.path.join(
    os.path.dirname(__file__), os.pardir, os.pardir, os.pardir, "execution"
)
sys.path.insert(0, os.path.abspath(EXECUTION_DIR))
