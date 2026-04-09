"""
conftest.py – patches pymongo.MongoClient with mongomock before app.py is imported.
"""
import sys
import os

import mongomock
import pymongo

# Patch at conftest load time (before any test module imports app)
pymongo.MongoClient = mongomock.MongoClient

# Ensure repo root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
