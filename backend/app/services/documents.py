import os
import re
from io import BytesIO
from uuid import uuid4

import requests
from dotenv import load_dotenv
from pypdf import PdfReader
from supabase import Client, create_client


load_dotenv()


class DocumentService:
    """
    Handles Nova PDF processing, hosted embeddings,
    Supabase persistence, and RAG retrieval.
    """

    MAX_FILE_SIZE = 15 * 1024 * 1024

    ALLOWED_CONTENT_TYPES = {
        "application/pdf",
        "application/x-pdf",
    }

    CHUNK_SIZE = 900
    CHUNK_OVERLAP = 150
    TOP_K_RESULTS = 5

    EMBEDDING_DIMENSION = 1536
    EMBEDDING_BATCH_SIZE = 64
    DATABASE_INSERT_BATCH_SIZE = 50

    def __init__(self) -> None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv(
            "SUPABASE_SERVICE_ROLE_KEY"
        )

        ai_base_url = os.getenv(
            "AI_BASE_URL",
            "https://openrouter.ai/api/v1",
        )

        ai_api_key = os.getenv("AI_API_KEY")

        embedding_model = os.getenv(
            "EMBEDDING_MODEL",
            "openai/text-embedding-3-small",
        )

        if not supabase_url:
            raise RuntimeError(
                "SUPABASE_URL is not configured."
            )

        if not supabase_key:
            raise RuntimeError(
                "SUPABASE_SERVICE_ROLE_KEY "
                "is not configured."
            )

        if not ai_api_key:
            raise RuntimeError(
                "AI_API_KEY is not configured."
            )

        self.supabase: Client = create_client(
            supabase_url,
            supabase_key,
        )

        self.embedding_url = (
            f"{ai_base_url.rstrip('/')}/embeddings"
        )

        self.embedding_api_key = ai_api_key
        self.embedding_model = embedding_model

    @staticmethod
    def _safe_identifier(
        value: str,
    ) -> str:
        cleaned_value = re.sub(
            r"[^a-zA-Z0-9_-]",
            "",
            value,
        )

        if not cleaned_value:
            raise ValueError(
                "Invalid identifier."
            )

        return cleaned_value

    @staticmethod
    def _clean_text(
        text: str,
    ) -> str:
        text = text.replace(
            "\x00",
            " ",
        )

        lines = [
            re.sub(
                r"\s+",
                " ",
                line,
            ).strip()
            for line in text.splitlines()
        ]

        return "\n".join(
            line
            for line in lines
            if line
        ).strip()

    def _create_embeddings(
        self,
        texts: list[str],
    ) -> list[list[float]]:
        """
        Creates embeddings using the hosted
        OpenRouter embeddings API.
        """

        if not texts:
            return []

        all_embeddings: list[list[float]] = []

        for start in range(
            0,
            len(texts),
            self.EMBEDDING_BATCH_SIZE,
        ):
            batch = texts[
                start:
                start + self.EMBEDDING_BATCH_SIZE
            ]

            try:
                response = requests.post(
                    self.embedding_url,
                    headers={
                        "Authorization": (
                            "Bearer "
                            f"{self.embedding_api_key}"
                        ),
                        "Content-Type": (
                            "application/json"
                        ),
                    },
                    json={
                        "model": self.embedding_model,
                        "input": batch,
                    },
                    timeout=(15, 120),
                )

            except requests.RequestException as error:
                raise RuntimeError(
                    "Could not connect to the "
                    "embedding provider."
                ) from error

            if not response.ok:
                raise RuntimeError(
                    "Embedding request failed: "
                    f"{response.status_code} "
                    f"{response.text[:500]}"
                )

            try:
                payload = response.json()
            except ValueError as error:
                raise RuntimeError(
                    "Embedding provider returned "
                    "an invalid response."
                ) from error

            data = payload.get("data")

            if not isinstance(data, list):
                raise RuntimeError(
                    "Embedding provider returned "
                    "invalid embedding data."
                )

            # Preserve provider ordering explicitly
            # when index values are provided.
            if all(
                isinstance(item, dict)
                and isinstance(
                    item.get("index"),
                    int,
                )
                for item in data
            ):
                data = sorted(
                    data,
                    key=lambda item: item["index"],
                )

            batch_embeddings = []

            for item in data:
                if not isinstance(item, dict):
                    raise RuntimeError(
                        "Embedding provider returned "
                        "invalid embedding data."
                    )

                embedding = item.get("embedding")

                if not isinstance(
                    embedding,
                    list,
                ):
                    raise RuntimeError(
                        "Embedding provider returned "
                        "an invalid vector."
                    )

                if (
                    len(embedding)
                    != self.EMBEDDING_DIMENSION
                ):
                    raise RuntimeError(
                        "Unexpected embedding "
                        "dimension. Expected "
                        f"{self.EMBEDDING_DIMENSION}, "
                        f"received {len(embedding)}."
                    )

                batch_embeddings.append(
                    embedding
                )

            if len(batch_embeddings) != len(batch):
                raise RuntimeError(
                    "Embedding count does not "
                    "match input count."
                )

            all_embeddings.extend(
                batch_embeddings
            )

        return all_embeddings

    def extract_pdf(
        self,
        file_content: bytes,
    ) -> tuple[list[dict], str]:
        try:
            reader = PdfReader(
                BytesIO(file_content)
            )

        except Exception as error:
            raise ValueError(
                "The PDF could not be opened."
            ) from error

        if reader.is_encrypted:
            try:
                result = reader.decrypt("")

                if result == 0:
                    raise ValueError(
                        "Password-protected PDFs "
                        "are not supported yet."
                    )

            except Exception as error:
                raise ValueError(
                    "Password-protected PDFs "
                    "are not supported yet."
                ) from error

        pages = []
        full_text_parts = []

        for page_number, page in enumerate(
            reader.pages,
            start=1,
        ):
            try:
                page_text = (
                    page.extract_text() or ""
                )

            except Exception:
                page_text = ""

            cleaned_text = self._clean_text(
                page_text
            )

            pages.append(
                {
                    "page_number": page_number,
                    "text": cleaned_text,
                }
            )

            if cleaned_text:
                full_text_parts.append(
                    cleaned_text
                )

        full_text = "\n\n".join(
            full_text_parts
        ).strip()

        if not full_text:
            raise ValueError(
                "No readable text was found. "
                "The PDF may be scanned or "
                "image-based."
            )

        return pages, full_text

    def _split_text(
        self,
        text: str,
    ) -> list[str]:
        text = text.strip()

        if not text:
            return []

        chunks = []
        start = 0
        text_length = len(text)

        while start < text_length:
            end = min(
                start + self.CHUNK_SIZE,
                text_length,
            )

            if end < text_length:
                possible_breaks = [
                    text.rfind(
                        "\n",
                        start,
                        end,
                    ),
                    text.rfind(
                        ". ",
                        start,
                        end,
                    ),
                    text.rfind(
                        " ",
                        start,
                        end,
                    ),
                ]

                best_break = max(
                    possible_breaks
                )

                minimum_break = (
                    start
                    + int(
                        self.CHUNK_SIZE
                        * 0.6
                    )
                )

                if best_break >= minimum_break:
                    end = best_break + 1

            chunk = text[
                start:end
            ].strip()

            if chunk:
                chunks.append(chunk)

            if end >= text_length:
                break

            next_start = (
                end
                - self.CHUNK_OVERLAP
            )

            if next_start <= start:
                next_start = end

            start = next_start

        return chunks

    def _create_chunks(
        self,
        pages: list[dict],
    ) -> list[dict]:
        chunks = []

        for page in pages:
            page_number = page[
                "page_number"
            ]

            page_text = page["text"]

            page_chunks = self._split_text(
                page_text
            )

            for (
                chunk_index,
                chunk_text,
            ) in enumerate(
                page_chunks,
                start=1,
            ):
                chunks.append(
                    {
                        "chunk_id": (
                            f"page-{page_number}"
                            f"-chunk-{chunk_index}"
                        ),
                        "page_number": (
                            page_number
                        ),
                        "chunk_index": (
                            chunk_index
                        ),
                        "text": chunk_text,
                    }
                )

        return chunks

    def _embed_chunks(
        self,
        chunks: list[dict],
    ) -> list[dict]:
        if not chunks:
            return chunks

        chunk_texts = [
            chunk["text"]
            for chunk in chunks
        ]

        embeddings = (
            self._create_embeddings(
                chunk_texts
            )
        )

        if len(embeddings) != len(chunks):
            raise RuntimeError(
                "Embedding count does not "
                "match chunk count."
            )

        for chunk, embedding in zip(
            chunks,
            embeddings,
        ):
            chunk["embedding"] = embedding

        return chunks

    def save_document(
        self,
        conversation_id: str,
        filename: str,
        content_type: str,
        file_content: bytes,
    ) -> dict:
        if not file_content:
            raise ValueError(
                "The uploaded PDF is empty."
            )

        if (
            len(file_content)
            > self.MAX_FILE_SIZE
        ):
            raise ValueError(
                "The PDF exceeds the "
                "15 MB limit."
            )

        if (
            content_type
            and content_type
            not in self.ALLOWED_CONTENT_TYPES
        ):
            raise ValueError(
                "Only PDF files are supported."
            )

        if not filename.lower().endswith(
            ".pdf"
        ):
            raise ValueError(
                "Only files ending in .pdf "
                "are supported."
            )

        safe_conversation_id = (
            self._safe_identifier(
                conversation_id
            )
        )

        pages, full_text = (
            self.extract_pdf(
                file_content
            )
        )

        chunks = self._create_chunks(
            pages
        )

        if not chunks:
            raise ValueError(
                "No usable text chunks could "
                "be created from this PDF."
            )

        chunks = self._embed_chunks(
            chunks
        )

        document_id = str(
            uuid4()
        )

        document_record = {
            "id": document_id,
            "conversation_id": (
                safe_conversation_id
            ),
            "filename": filename,
            "content_type": (
                content_type
                or "application/pdf"
            ),
            "file_size": len(
                file_content
            ),
            "page_count": len(pages),
            "character_count": len(
                full_text
            ),
            "chunk_count": len(
                chunks
            ),
        }

        try:
            (
                self.supabase
                .table("documents")
                .insert(document_record)
                .execute()
            )

            chunk_records = []

            for chunk in chunks:
                chunk_records.append(
                    {
                        "document_id": (
                            document_id
                        ),
                        "conversation_id": (
                            safe_conversation_id
                        ),
                        "filename": filename,
                        "page_number": (
                            chunk[
                                "page_number"
                            ]
                        ),
                        "chunk_index": (
                            chunk[
                                "chunk_index"
                            ]
                        ),
                        "content": (
                            chunk["text"]
                        ),
                        "embedding": (
                            chunk["embedding"]
                        ),
                    }
                )

            for start in range(
                0,
                len(chunk_records),
                self.DATABASE_INSERT_BATCH_SIZE,
            ):
                batch = chunk_records[
                    start:
                    start
                    + self.DATABASE_INSERT_BATCH_SIZE
                ]

                (
                    self.supabase
                    .table("document_chunks")
                    .insert(batch)
                    .execute()
                )

        except Exception as error:
            # If chunk insertion fails after the
            # document was created, remove the
            # document. The foreign-key cascade
            # removes any chunks already inserted.
            try:
                (
                    self.supabase
                    .table("documents")
                    .delete()
                    .eq(
                        "id",
                        document_id,
                    )
                    .execute()
                )

            except Exception:
                pass

            raise RuntimeError(
                "Could not save the document "
                "to Nova's knowledge store."
            ) from error

        return {
            "id": document_id,
            "filename": filename,
            "page_count": len(pages),
            "character_count": len(
                full_text
            ),
            "chunk_count": len(
                chunks
            ),
            "message": (
                "PDF uploaded, processed, "
                "and indexed successfully."
            ),
        }

    def list_documents(
        self,
        conversation_id: str,
    ) -> list[dict]:
        safe_conversation_id = (
            self._safe_identifier(
                conversation_id
            )
        )

        response = (
            self.supabase
            .table("documents")
            .select(
                "id,"
                "filename,"
                "page_count,"
                "character_count,"
                "chunk_count,"
                "created_at"
            )
            .eq(
                "conversation_id",
                safe_conversation_id,
            )
            .order(
                "created_at",
                desc=True,
            )
            .execute()
        )

        rows = response.data or []

        return [
            {
                "id": row["id"],
                "filename": (
                    row["filename"]
                ),
                "page_count": (
                    row["page_count"]
                ),
                "character_count": (
                    row.get(
                        "character_count",
                        0,
                    )
                ),
                "chunk_count": (
                    row.get(
                        "chunk_count",
                        0,
                    )
                ),
            }
            for row in rows
        ]

    def delete_document(
        self,
        conversation_id: str,
        document_id: str,
    ) -> bool:
        safe_conversation_id = (
            self._safe_identifier(
                conversation_id
            )
        )

        safe_document_id = (
            self._safe_identifier(
                document_id
            )
        )

        existing = (
            self.supabase
            .table("documents")
            .select("id")
            .eq(
                "id",
                safe_document_id,
            )
            .eq(
                "conversation_id",
                safe_conversation_id,
            )
            .limit(1)
            .execute()
        )

        if not existing.data:
            return False

        try:
            (
                self.supabase
                .table("documents")
                .delete()
                .eq(
                    "id",
                    safe_document_id,
                )
                .eq(
                    "conversation_id",
                    safe_conversation_id,
                )
                .execute()
            )

        except Exception as error:
            raise RuntimeError(
                "Could not delete "
                "the document."
            ) from error

        return True

    def delete_conversation_documents(
        self,
        conversation_id: str,
    ) -> None:
        safe_conversation_id = (
            self._safe_identifier(
                conversation_id
            )
        )

        try:
            (
                self.supabase
                .table("documents")
                .delete()
                .eq(
                    "conversation_id",
                    safe_conversation_id,
                )
                .execute()
            )

        except Exception as error:
            raise RuntimeError(
                "Could not delete conversation "
                "documents."
            ) from error

    def retrieve_context(
        self,
        query: str,
        conversation_id: str,
        top_k: int | None = None,
    ) -> list[dict]:
        safe_conversation_id = (
            self._safe_identifier(
                conversation_id
            )
        )

        cleaned_query = query.strip()

        if not cleaned_query:
            return []

        try:
            document_check = (
                self.supabase
                .table("documents")
                .select("id")
                .eq(
                    "conversation_id",
                    safe_conversation_id,
                )
                .limit(1)
                .execute()
            )

        except Exception as error:
            raise RuntimeError(
                "Could not check conversation "
                "documents."
            ) from error

        if not document_check.data:
            return []

        query_embeddings = (
            self._create_embeddings(
                [cleaned_query]
            )
        )

        if not query_embeddings:
            return []

        query_embedding = (
            query_embeddings[0]
        )

        result_limit = (
            top_k
            or self.TOP_K_RESULTS
        )

        try:
            response = (
                self.supabase
                .rpc(
                    "match_document_chunks",
                    {
                        "query_embedding": (
                            query_embedding
                        ),
                        "match_conversation_id": (
                            safe_conversation_id
                        ),
                        "match_count": (
                            result_limit
                        ),
                    },
                )
                .execute()
            )

        except Exception as error:
            raise RuntimeError(
                "Could not retrieve document "
                "context."
            ) from error

        rows = response.data or []

        results = []

        for row in rows:
            results.append(
                {
                    "document_id": (
                        row["document_id"]
                    ),
                    "filename": (
                        row["filename"]
                    ),
                    "page_number": (
                        row["page_number"]
                    ),
                    "text": (
                        row["content"]
                    ),
                    "score": float(
                        row.get(
                            "similarity",
                            0.0,
                        )
                    ),
                }
            )

        return results

    def build_rag_context(
        self,
        query: str,
        conversation_id: str,
    ) -> str | None:
        results = self.retrieve_context(
            query=query,
            conversation_id=conversation_id,
        )

        if not results:
            return None

        context_sections = []

        for index, result in enumerate(
            results,
            start=1,
        ):
            context_sections.append(
                (
                    f"[Source {index}: "
                    f"{result['filename']}, "
                    f"page "
                    f"{result['page_number']}]\n"
                    f"{result['text']}"
                )
            )

        return "\n\n".join(
            context_sections
        )


document_service = DocumentService()