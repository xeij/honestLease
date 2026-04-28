from fpdf import FPDF

LEASE_TEXT = """RESIDENTIAL LEASE AGREEMENT

This Residential Lease Agreement is entered into as of January 1, 2025, between
Landlord: John Smith, and Tenant: Jane Doe.

PROPERTY: 123 Main Street, Apt 4B, New York, NY 10001.

TERM: This lease commences February 1, 2025 and expires January 31, 2026.

AUTO-RENEWAL: This lease automatically renews for successive one-year terms unless
either party provides written notice of non-renewal at least 60 days prior to the
expiration date. Failure to provide notice results in a binding renewal.

RENT: Monthly rent is $2,000, due on the first of each month. A late fee of $150
applies after 5 days. Returned check fee: $50. Administrative processing fee: $25/month.

SECURITY DEPOSIT: Tenant shall deposit $4,000 as security. Landlord may deduct for
damages beyond normal wear and tear, unpaid rent, and cleaning. Deposit returned
within 30 days of move-out. No interest paid on deposit.

UTILITIES: Tenant is responsible for electricity, gas, and internet. Landlord
covers water and trash collection.

MAINTENANCE: Tenant is responsible for all repairs under $100. Tenant must report
issues within 24 hours or forfeit the right to repair claims.

PARKING: One parking space included. Additional spaces available at $150/month.

EARLY TERMINATION: Tenant may terminate with 60 days written notice and payment
of two months rent as a termination fee.

SUBLETTING: No subletting permitted without prior written consent of landlord.
Consent may be withheld at landlord sole discretion.

PETS: No pets without written consent and a non-refundable pet fee of $500.

ENTRY: Landlord may enter premises with 24-hour notice for inspections or repairs.

GOVERNING LAW: This agreement is governed by the laws of the State of New York.

ENTIRE AGREEMENT: This lease constitutes the entire agreement between the parties.
"""


def generate(output_path: str = "backend/tests/fixtures/sample_lease.pdf") -> None:
    pdf = FPDF()
    pdf.set_margins(15, 15, 15)
    pdf.add_page()
    pdf.set_font("Helvetica", size=11)
    usable_width = pdf.w - pdf.l_margin - pdf.r_margin
    for line in LEASE_TEXT.split("\n"):
        pdf.multi_cell(usable_width, 6, line)
    pdf.output(output_path)
    print(f"Generated {output_path}")


if __name__ == "__main__":
    generate()
