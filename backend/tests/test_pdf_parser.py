import pytest
from app.services.pdf_parser import extract_text, validate_text


def _make_pdf(text: str) -> bytes:
    from fpdf import FPDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    pdf.multi_cell(0, 6, text)
    return bytes(pdf.output())


def test_extract_text_returns_text_from_valid_pdf():
    pdf_bytes = _make_pdf("This is a sample lease agreement with enough content.")
    result = extract_text(pdf_bytes)
    assert "lease" in result.lower()


def test_extract_text_returns_string():
    pdf_bytes = _make_pdf("Hello world")
    assert isinstance(extract_text(pdf_bytes), str)


def test_validate_text_passes_on_sufficient_text():
    long_text = "x" * 600
    validate_text(long_text)  # should not raise


def test_validate_text_raises_on_short_text():
    with pytest.raises(ValueError, match="scanned image"):
        validate_text("too short")
