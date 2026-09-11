from agno.agent import Agent
from agno.models.ollama import Ollama
from dotenv import load_dotenv
from agno.tools.coding import CodingTools
import subprocess
import os
from config import MODEL_ID , db , KEEP_ALIVE
os.makedirs("./sandbox", exist_ok=True)
load_dotenv()
coding_tools=CodingTools(
    base_dir="./sandbox",
    restrict_to_base_dir=True,
    allowed_commands=[
        "ls", "cat", "python", "pip",
        "node", "npm", "git", "echo",
        "mkdir", "cp"
    ],
    shell_timeout=30,
    max_lines=2000,
    max_bytes=5000
)
def coding_exec():
    code_agent = Agent(
        model=Ollama(id=MODEL_ID,keep_alive=KEEP_ALIVE),
        name="code executer",
        role="Writes and executes code, runs shell commands, handles programming tasks",
        instructions=[
        "You have access to EXACTLY these tools: read_file, edit_file, write_file, run_shell. NEVER invent or call any other tool name like 'confirm_file_creation'.",
        "To create a file, you MUST actually call the write_file tool with 'file_path' and 'contents' parameters — never just output JSON text describing what you would do.",
        "When using the write_file tool, always use 'file_path' as the parameter name for the file location — NEVER use 'path'.",
        "Just create and run files in the base dir.",
        "After creating the file, always run it using run_shell to verify it works correctly.",
        "If the code fails, read the error, fix the file, and run it again until it works.",
        "NEVER report success or describe output unless you actually invoked write_file and run_shell — do not simulate or predict results as if they happened.",
        "Report the final output/result after successful execution.",
        "Don't execute system level commands like delete or network access.",
        "Explain every step before executing code.",
        "Return the name of the file as example 'file_name=temp.js'."
        ],
        tools=[coding_tools],
        debug_mode=True,
        markdown=True,
        db=db
    )
    return code_agent




