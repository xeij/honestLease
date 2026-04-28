import io

import pdfplumber

MIN_CHARS = 500


def extract_text(pdf_bytes: bytes) -> str:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n\n".join(pages).strip()


def validate_text(text: str) -> None:
    if len(text) < MIN_CHARS:
        raise ValueError(
            "This lease appears to be a scanned image — "
            "we can only analyze text-based PDFs right now."
        )
