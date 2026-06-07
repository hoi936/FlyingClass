__version__ = "0.0.1"

import os
from dotenv import load_dotenv

workspace_env = "/home/user/Flying_Class/.env"
if os.path.exists(workspace_env):
    load_dotenv(workspace_env)
else:
    load_dotenv()
