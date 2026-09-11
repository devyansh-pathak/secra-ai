from agno.agent import Agent
from agno.models.ollama import Ollama
from dotenv import load_dotenv
from docx import Document
from pptx import Presentation
from pptx.util import Inches
from agno.tools import tool
from dotenv import load_dotenv
import os
import random
from typing import List,Union,Dict
import pandas as pd
import json
import ast
from config import MODEL_ID,KEEP_ALIVE,db
load_dotenv()

path = r"./generated_files"
@tool
def create_text_file(filename:str,text:str) -> str:
    path = r"./generated_files"
    os.makedirs(path,exist_ok=True)
    with open(f"./generated_files/{filename}","w",encoding="utf-8") as f:
        f.write(text)
    return f"text file created: {filename}.txt"
@tool
def create_word_file(filename:str,text:str)-> str:
    doc=Document()
    doc.add_paragraph(text)
    doc.save(f"{path}/{filename}")
    return f"word file generated: {filename}"
@tool
def create_ppt_file(filename:str,main_title:str,slides:Union[str,List[dict],Dict[str,str]])-> str:
    if not filename.lower().endswith(".pptx"):
        filename = filename + ".pptx"
    if isinstance(slides,dict):
        slides=[{"title":x,"body":y}for x,y in slides.items]
    if isinstance(slides,str):
        try:
            slides=json.loads(slides)
        except json.JSONDecodeError:
            try:
                slides=ast.literal_eval(slides)
            except(ValueError,SyntaxError):
                 return f"Error: could not parse 'slides' — got invalid format: {slides[:100]}"
    if not isinstance(slides, list):
        return "Error: 'slides' must resolve to a list of dicts."
    useable_layouts=[1,2,3]
    prs=Presentation()
    title_slide = prs.slides.add_slide(prs.slide_layouts[0])
    title_slide.shapes.title.text = main_title
    for slide_data in slides:
        slide = prs.slides.add_slide(prs.slide_layouts[random.choice(useable_layouts)])
        slide.shapes.title.text = slide_data["title"]
        if len(slide.placeholders)>1:
            slide.placeholders[1].text = slide_data["body"]
    prs.save(f"{path}/{filename}")
    return f"PPT created with title slide + {len(slides)} content slides : {filename}"
@tool
def create_excel_file(filename:str,data:Union[str,List[dict],Dict])->str:
    if isinstance(data,dict):
        if all(not isinstance(v, (list, tuple)) for v in data.values()):
            data = [data]
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError:
            try:
                data = ast.literal_eval(data)
            except (ValueError, SyntaxError):
                return f"Error: could not parse 'data' — got invalid format: {data[:100]}"
    if not filename.lower().endswith(".xlsx"):
        filename = os.path.splitext(filename)[0] + ".xlsx"
    df=pd.DataFrame(data)
    df.to_excel(f"{path}/{filename}",index=False)
    return f"Excel file created: {filename}"
def create_files():
    file_agent=Agent(
        model=Ollama(id=MODEL_ID,keep_alive=KEEP_ALIVE),
        name="file generator",
        role="Creates text files, Word documents, and PowerPoint presentations from given content",
        instructions=[
            "When generating tabular data for create_excel_file, structure 'data' as EITHER: "
            "(1) a list of row-dicts where each dict is one row with column names as keys, e.g. "
            "[{'col1': 1, 'col2': 2, 'col3': 3}, {'col1': 4, 'col2': 5, 'col3': 6}] for 2 rows and 3 columns, "
            "OR (2) a column-oriented dict where each key is a column name mapping to a list of values for that column, e.g. "
            "{'col1': [1, 4], 'col2': [2, 5], 'col3': [3, 6]}. "
            "NEVER flatten data into a single dict of scalar values like {'A1': 1, 'A2': 2} — that loses row/column structure.",
            "For N rows and M columns, make sure the final structure has exactly M keys (columns) each containing a list of N values, OR exactly N row-dicts each containing M key-value pairs.",
            "When calling create_ppt_file, the 'slides' parameter MUST be an actual JSON array of objects, not a string. Example: slides=[{'title': 'Introduction', 'body': '...'}, {'title': 'Key Points', 'body': '...'}]",
            "Never wrap the slides list in quotes or pass it as a string.",
            "You have access to EXACTLY these tools: create_text_file, create_word_file, create_ppt_file, create_excel_file. NEVER invent or call any other tool name like 'confirm_file_creation'.",
            "To create a file, you MUST actually call the appropriate tool — never just output JSON text describing what you would do.",
            "NEVER report a file as created unless you actually invoked the corresponding tool. Do not describe or predict file content as if it was saved without calling the tool first.",
            "You are an assistant that creates files based on user requests.",
            "Use create_text_file when the user asks for a plain text file.",
            "Use create_word_file when the user asks for a Word document.",
            "Use create_ppt_file when the user asks for a presentation or PPT.",
            "Use create_excel_file when the user asks for an excel document.",
            "Pick a clear, descriptive filename based on the content if the user doesn't specify one.",
            "Just use one tool in one go — this is mandatory.",
            "When creating a PPT, pass slides as: [{'title': 'Slide 1', 'body': 'content'}, {'title': 'Slide 2', 'body': 'content'}] — always a list of objects, never a plain dictionary or string.",
            "If an excel file is generated, take care of the column order very precisely."
        ],
        tools=[create_text_file,create_word_file,create_ppt_file,create_excel_file],
        db=db
    )
    return file_agent

"""
def create_files_test():
    return Agent(
        name="file generator",
        role="Creates text files",
        model=Ollama(id="qwen2.5:7b"),
        instructions=[
            "You have access to EXACTLY this tool: create_text_file.",
            "You MUST actually call the tool — never output JSON text."
        ],
        tools=[create_text_file]   # sirf ek tool
    )

agent = create_files_test()
response = agent.run("Create a text file listing types of phones")
print(response.content)"""