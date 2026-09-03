import json
import re
import shutil
from io import BytesIO
from pathlib import Path
from threading import Lock
from uuid import uuid4

import numpy as np
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer


class DocumentService:
    MAX_FILE_SIZE = 15 * 1024 * 1024

    ALLOWED_CONTENT_TYPES = {
        "application/pdf",
        "application/x-pdf",
    }

    EMBEDDING_MODEL_NAME = (
        "sentence-transformers/all-MiniLM-L6-v2"
    )

    CHUNK_SIZE = 900
    CHUNK_OVERLAP = 150
    TOP_K_RESULTS = 5

    def __init__(self) -> None:
        backend_directory = (
            Path(__file__).resolve().parents[2]
        )

        self.documents_directory = (
            backend_directory
            / "data"
            / "documents"
        )

        self.documents_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        self._embedding_model = None
        self._model_lock = Lock()

    def _get_embedding_model(
        self,
    ) -> SentenceTransformer:
        if self._embedding_model is None:
            with self._model_lock:
                if self._embedding_model is None:
                    self._embedding_model = (
                        SentenceTransformer(
                            self.EMBEDDING_MODEL_NAME
                        )
                    )

        return self._embedding_model

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
                "The PDF may be scanned or image-based."
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

            page_chunks = (
                self._split_text(
                    page_text
                )
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
                        "text": (
                            chunk_text
                        ),
                    }
                )

        return chunks

    def _embed_chunks(
        self,
        chunks: list[dict],
    ) -> list[dict]:
        if not chunks:
            return chunks

        model = (
            self._get_embedding_model()
        )

        chunk_texts = [
            chunk["text"]
            for chunk in chunks
        ]

        embeddings = model.encode(
            chunk_texts,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        )

        for chunk, embedding in zip(
            chunks,
            embeddings,
        ):
            chunk["embedding"] = (
                embedding.astype(
                    np.float32
                ).tolist()
            )

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

        chunks = self._embed_chunks(
            chunks
        )

        if not chunks:
            raise ValueError(
                "No usable text chunks "
                "could be created from "
                "this PDF."
            )

        document_id = str(
            uuid4()
        )

        conversation_directory = (
            self.documents_directory
            / safe_conversation_id
        )

        conversation_directory.mkdir(
            parents=True,
            exist_ok=True,
        )

        document_data = {
            "id": document_id,
            "conversation_id": (
                safe_conversation_id
            ),
            "filename": filename,
            "content_type": content_type,
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
            "pages": pages,
            "full_text": full_text,
            "chunks": chunks,
        }

        document_path = (
            conversation_directory
            / f"{document_id}.json"
        )

        document_path.write_text(
            json.dumps(
                document_data,
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )

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

    def _load_document(
        self,
        document_path: Path,
    ) -> dict | None:
        try:
            document_data = json.loads(
                document_path.read_text(
                    encoding="utf-8"
                )
            )
        except (
            OSError,
            json.JSONDecodeError,
        ):
            return None

        chunks = document_data.get(
            "chunks"
        )

        needs_indexing = (
            not isinstance(
                chunks,
                list,
            )
            or not chunks
            or any(
                "embedding"
                not in chunk
                for chunk in chunks
            )
        )

        if needs_indexing:
            pages = document_data.get(
                "pages",
                [],
            )

            chunks = (
                self._create_chunks(
                    pages
                )
            )

            chunks = (
                self._embed_chunks(
                    chunks
                )
            )

            document_data[
                "chunks"
            ] = chunks

            document_data[
                "chunk_count"
            ] = len(chunks)

            try:
                document_path.write_text(
                    json.dumps(
                        document_data,
                        ensure_ascii=False,
                        indent=2,
                    ),
                    encoding="utf-8",
                )
            except OSError:
                pass

        return document_data

    def list_documents(
        self,
        conversation_id: str,
    ) -> list[dict]:
        safe_conversation_id = (
            self._safe_identifier(
                conversation_id
            )
        )

        conversation_directory = (
            self.documents_directory
            / safe_conversation_id
        )

        if (
            not conversation_directory.exists()
        ):
            return []

        documents = []

        for document_path in sorted(
            conversation_directory.glob(
                "*.json"
            ),
            key=lambda path: (
                path.stat().st_mtime
            ),
            reverse=True,
        ):
            data = self._load_document(
                document_path
            )

            if not data:
                continue

            documents.append(
                {
                    "id": data["id"],
                    "filename": (
                        data["filename"]
                    ),
                    "page_count": (
                        data["page_count"]
                    ),
                    "character_count": (
                        data.get(
                            "character_count",
                            0,
                        )
                    ),
                    "chunk_count": (
                        data.get(
                            "chunk_count",
                            0,
                        )
                    ),
                }
            )

        return documents

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

        conversation_directory = (
            self.documents_directory
            / safe_conversation_id
        )

        document_path = (
            conversation_directory
            / f"{safe_document_id}.json"
        )

        if not document_path.exists():
            return False

        try:
            document_path.unlink()
        except OSError as error:
            raise RuntimeError(
                "Could not delete "
                "the document."
            ) from error

        try:
            has_documents = any(
                conversation_directory.glob(
                    "*.json"
                )
            )

            if (
                conversation_directory.exists()
                and not has_documents
            ):
                conversation_directory.rmdir()
        except OSError:
            pass

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

        conversation_directory = (
            self.documents_directory
            / safe_conversation_id
        )

        if (
            conversation_directory.exists()
        ):
            shutil.rmtree(
                conversation_directory,
                ignore_errors=True,
            )

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

        conversation_directory = (
            self.documents_directory
            / safe_conversation_id
        )

        if (
            not conversation_directory.exists()
        ):
            return []

        all_chunks = []

        for document_path in (
            conversation_directory.glob(
                "*.json"
            )
        ):
            document_data = (
                self._load_document(
                    document_path
                )
            )

            if not document_data:
                continue

            filename = (
                document_data.get(
                    "filename",
                    "Unknown document",
                )
            )

            document_id = (
                document_data.get(
                    "id",
                    document_path.stem,
                )
            )

            for chunk in (
                document_data.get(
                    "chunks",
                    [],
                )
            ):
                embedding = chunk.get(
                    "embedding"
                )

                if not embedding:
                    continue

                all_chunks.append(
                    {
                        "document_id": (
                            document_id
                        ),
                        "filename": (
                            filename
                        ),
                        "page_number": (
                            chunk[
                                "page_number"
                            ]
                        ),
                        "text": (
                            chunk["text"]
                        ),
                        "embedding": (
                            embedding
                        ),
                    }
                )

        if not all_chunks:
            return []

        model = (
            self._get_embedding_model()
        )

        query_embedding = model.encode(
            query,
            convert_to_numpy=True,
            normalize_embeddings=True,
            show_progress_bar=False,
        ).astype(
            np.float32
        )

        scored_chunks = []

        for chunk in all_chunks:
            chunk_embedding = (
                np.asarray(
                    chunk[
                        "embedding"
                    ],
                    dtype=np.float32,
                )
            )

            score = float(
                np.dot(
                    query_embedding,
                    chunk_embedding,
                )
            )

            scored_chunks.append(
                {
                    "document_id": (
                        chunk[
                            "document_id"
                        ]
                    ),
                    "filename": (
                        chunk[
                            "filename"
                        ]
                    ),
                    "page_number": (
                        chunk[
                            "page_number"
                        ]
                    ),
                    "text": (
                        chunk["text"]
                    ),
                    "score": score,
                }
            )

        scored_chunks.sort(
            key=lambda item: (
                item["score"]
            ),
            reverse=True,
        )

        result_limit = (
            top_k
            or self.TOP_K_RESULTS
        )

        return scored_chunks[
            :result_limit
        ]

    def build_rag_context(
        self,
        query: str,
        conversation_id: str,
    ) -> str | None:
        results = (
            self.retrieve_context(
                query=query,
                conversation_id=(
                    conversation_id
                ),
            )
        )

        if not results:
            return None

        context_sections = []

        for (
            index,
            result,
        ) in enumerate(
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