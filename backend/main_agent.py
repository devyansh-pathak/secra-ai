import os
os.environ["AGNO_TELEMETRY"] = "false"
from agno.agent import Agent
from  agno.team import Team
from agno.models.ollama import Ollama
from file_writing.code_exec import coding_exec
from file_writing.other_files import create_files
from config import MODEL_ID , db , KEEP_ALIVE
from secra_ai import ask_pdf,ask_photo

from agno.tools import tool

def ocr_agent():
    return Agent(
        name="ocr reader",
        role="Reads and extracts text from images and photos using OCR",
        model=Ollama(id="qwen2.5:7b"),
        instructions=[
            "Use ask_photo to answer any query about an image or photo file (jpg, jpeg, png, bmp, tiff).",
            "Always call the tool — never guess or describe what the image might contain without actually processing it."
        ],
        tools=[ask_photo]
    )

def rag_agent():
    return Agent(
        name="document retriever",
        role="Reads and answers queries about PDF documents using retrieval-augmented search",
        model=Ollama(id="qwen2.5:7b"),
        instructions=[
            "Use ask_pdf to answer any query about a PDF file.",
            "Always call the tool — never guess or describe document content without actually processing it."
        ],
        tools=[ask_pdf]
    )

def general_agent():
    agent = Agent(
        model=Ollama(id=MODEL_ID, keep_alive=KEEP_ALIVE),
        name="general assistant",
        role="Handles general conversation, greetings, questions, and preferences that don't require file creation or code execution",
        instructions=[
            "Answer general questions, have conversation, and remember user preferences like language choice.",
            "Do NOT attempt file creation or code execution yourself — if the user's actual request needs that, say so and let the team route it.",
        ],
        db=db,
        add_history_to_context=True,
        num_history_runs=3,
    )
    return agent

secra_team = Team(
    name="secra",
    mode="coordinate",
    model=Ollama(id="qwen2.5:7b",keep_alive=KEEP_ALIVE),
    members=[coding_exec(),create_files(),general_agent(),rag_agent(),ocr_agent()],
    tool_call_limit=3,
    instructions=[
    "You coordinate a team. NEVER answer file/code/document/image tasks yourself — ALWAYS delegate via a real tool call.",
    "File generator: creates NEW files (PPT/Word/Excel/text) from scratch.",
    "Code executer: reads/edits/runs EXISTING files (including HTML/CSS/JS/code).",
    "OCR agent: handles image/photo files.",
    "rag agent: handles PDF files.",
    "When delegating to OCR reader or document retriever, always include the exact file path from the user's message.",
    "General assistant: only for plain conversation with no file/code/document involved.",
    "Never confirm success without actual tool execution by the member.",
    ],
    add_history_to_context=True,
    num_history_runs=3,
    db=db,
    update_memory_on_run=True,
    tool_choice="required"
)
secra_team.print_response(r"summarize this PDF:C:\Devyansh\VS\secra\random_links_test.pdf",stream=True,user_id="devyansh",session_id="testing")
