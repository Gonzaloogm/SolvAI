import requests
import json
import os
import shutil

report_id = "e880c122-d8d0-4d38-8bf7-a9eee9d539fb"
url = f"http://localhost:8000/solvency-reports/{report_id}/pdf"
# We need an auth token. Instead of doing full auth, let's just run a script inside solvai_api to generate the PDF and copy it out.
