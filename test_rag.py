from rag.retrieval import (
    get_retrieval_service,
    get_reranker
)

from rag.ollama_llm import generate_answer


def main():

    query = input("Question: ")

    retriever = get_retrieval_service(
        reranker=get_reranker()
    )

    results = retriever.retrieve(
        query=query,
        user_id=None,
        user_roles=set(),
        user_permissions=set()
    )

    if not results:
        print("No documents found.")
        return

    context = "\n\n".join(
        chunk.text
        for chunk in results
    )

    answer = generate_answer(
        query,
        context,
        sources=results
    )

    print("\nAnswer:")
    print(answer["answer"])

    print("\n===== SOURCES OBJECT =====")
    print(answer["sources"])

    print("\nSources:")

    for i, source in enumerate(answer["sources"], start=1):

        print(f"\n[{i}] {source.get('filename')}")

        if source.get("page_number") is not None:
            print(f"Page: {source.get('page_number')}")

        if source.get("document_id"):
            print(f"Document ID: {source.get('document_id')}")

        if source.get("chunk_id"):
            print(f"Chunk ID: {source.get('chunk_id')}")

        if source.get("classification"):
            print(f"Classification: {source.get('classification')}")


if __name__ == "__main__":
    main()