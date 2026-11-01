# 13 — Forms and External Services

## Form actions in supplied HTML

| Page | Service/action |
|---|---|
| `index.html` | SubmitKit endpoint for home enquiry |
| `career.html` | SubmitKit endpoint for career/application form |
| `free-consultation.html` | SubmitKit endpoint for free consultation |
| `paid-consultation.html` | SubmitKit endpoint for paid consultation |
| `newsletter.html` | Brevo/Sibforms subscription endpoint |
| `consultation.html` | Consultation information/routing page; no form action confirmed by grep |

The current archive contains these SubmitKit action identifiers:
- Home enquiry: `https://submitkit.dev/api/f/cmvuvjob0001fspvgwd9786me`
- Career form: `https://submitkit.dev/api/f/cmvuvwa97001zspv4pa00r4hc`
- Free consultation: `https://submitkit.dev/api/f/cmvuw5xuh001jspvgvjhqtlta`
- Paid consultation: `https://submitkit.dev/api/f/cmvuv663u001lspvghwvfn33c`

These are public form endpoint identifiers visible in HTML, not credentials. The newsletter subscription action points to a Brevo/Sibforms hosted endpoint; the exact long endpoint is not reproduced here.

## Submission behavior and limitations

- Forms use HTML form actions and methods, including multipart for file uploads where specified.
- Current field validation and exact success/redirect behavior depend on HTML and provider configuration.
- SubmitKit's redirect behavior was previously discussed: custom redirect URL required Pro or higher in the user’s observed plan; the default thank-you behavior was used when custom redirect was unavailable.
- Current spam controls and provider-side settings are not verifiable from repository source alone.

## FormSubmit Error 521 history

Prior conversation records:
- `https://formsubmit.co/info@peoplejuris.com` returned Cloudflare Error 521.
- User tested with curl and received HTTP 521 via HTTP/1.1 and HTTP/2.
- A replacement service was sought that would be free/safe without changing production DNS.
- `useformz.com` had a certificate issue reported by curl.
- SubmitKit endpoints were subsequently used in page forms.

Exact FormSubmit root cause is not established by the evidence; document the observed failure, not a speculative cause. No DNS/routing change was approved as part of that troubleshooting.

## Safe tests

Test provider forms with non-sensitive test submissions. Avoid sending personal or real client data during documentation verification. Confirm destination inbox and redirect behavior with the provider account owner.
