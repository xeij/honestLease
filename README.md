# honestLease

Most people sign a lease without fully understanding what they're agreeing to. honestLease lets you upload a residential lease PDF and get back a plain-English breakdown of the parts that actually matter: auto-renewal clauses, deposit conditions, unusual fees, and missing standard protections. Each finding includes the exact quote from your lease and a specific thing you can ask the landlord to change.

## How it works

The frontend uploads your PDF directly to S3 via a presigned URL, then sends the S3 key to the backend. A Lambda function extracts the text, sends it to Claude with a structured prompt, and stores the result in DynamoDB. Because Claude can take 40-60 seconds on a full lease, the API returns immediately with a summary ID and processes the analysis asynchronously — the frontend polls until it's ready. Summaries are stored for 90 days and shareable by link.

## Tech stack

- React, TypeScript, Vite — frontend
- Python, FastAPI, Mangum — backend
- AWS Lambda, API Gateway, S3, DynamoDB — infrastructure
- AWS SAM — deployment
- AWS Amplify — frontend hosting
- Anthropic Claude API — lease analysis
- pdfplumber — PDF text extraction
