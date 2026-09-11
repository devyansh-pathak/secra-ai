import requests

OLLAMA_URL = "http://localhost:11434/api/generate"

MODEL_NAME = "llama3.2"


import requests


# ============================================================
# OLLAMA CONFIGURATION
# ============================================================

OLLAMA_URL = "http://localhost:11434/api/generate"

OLLAMA_MODEL = "llama3.2"


# ============================================================
# GENERATE ANSWER
# ============================================================

def generate_answer(question: str, context: str, sources=None):

    if sources is None:
        sources = []

    prompt = f"""
You are an enterprise AI assistant.

STRICT RULES:

1. Answer ONLY using information explicitly present in the
   provided context.

2. Do NOT use outside knowledge.

3. Do NOT guess or assume anything.

4. Do NOT correct, change, or reinterpret facts from the context.

5. Preserve names, numbers, dates, spellings, and technical
   terms exactly as written in the context.

6. If the answer is not explicitly present in the context,
   respond exactly:

Information not found in provided documents.

7. Give a concise and direct answer.

8. Do NOT invent sources.

9. Do NOT mention information that is not present in the
   provided context.

Context:
{context}

Question:
{question}

Answer:
"""

    print("\n===== CONTEXT SENT TO LLM =====\n")
    print(context)

    print("\n===== PROMPT =====\n")
    print(prompt)

    # ========================================================
    # CALL OLLAMA
    # ========================================================

    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
            },
            timeout=120,
        )

        response.raise_for_status()

    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Could not connect to Ollama. Make sure Ollama is running."
        )

    except requests.exceptions.Timeout:
        raise RuntimeError(
            "Ollama request timed out."
        )

    except requests.exceptions.RequestException as e:
        raise RuntimeError(
            f"Ollama request failed: {e}"
        )

    # ========================================================
    # READ LLM RESPONSE
    # ========================================================

    try:
        data = response.json()
        raw_response = data.get("response", "").strip()

    except Exception:
        raise RuntimeError(
            "Invalid response received from Ollama."
        )

    print("\n===== RAW LLM RESPONSE =====\n")
    print(raw_response)


    # ========================================================
    # BUILD SOURCE CITATIONS
    # ========================================================

    citation_list = []

    for source in sources:

        if hasattr(source, "to_source_dict"):
            source_data = source.to_source_dict()
            print("SOURCE DATA:", source_data)
        else:
            source_data = {}
            print("SOURCE DATA: {}")

        try:
            print("SOURCE VARS:", vars(source))
        except Exception as e:
            print("VARS ERROR:", e)

        citation = {
            "filename": source_data.get("filename"),
            "page_number": source_data.get(
                "page_number",
                source_data.get("page")
            ),
            "document_id": source_data.get("document_id"),
            "chunk_id": source_data.get("chunk_id"),
            "classification": source_data.get("classification"),
        }

        # Avoid duplicate citations
        if citation not in citation_list:
            citation_list.append(citation)

    # ========================================================
    # RETURN RESPONSE
    # ========================================================

    return {
        "answer": raw_response.strip(),
        "sources": citation_list,
    }


from config import MODEL_ID
class OllamaLLM:

    def generate(self, prompt: str):

        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_ID,
                "prompt": prompt,
                "stream": False
            }
        )

        response.raise_for_status()

        return response.json()["response"]


def get_llm():
    return OllamaLLM()