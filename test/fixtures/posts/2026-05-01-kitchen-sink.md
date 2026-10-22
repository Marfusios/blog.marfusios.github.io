---
title: 'Příliš žluťoučký kůň & <AI> "agents": a very long title to test wrapping on phones'
description: 'Kitchen-sink fixture: headings, a 200-character code line, a long URL, a wide table, quotes, images and footnotes.'
date: 2026-05-01
topics: [AI apps, RAG, Observability]
---

Accident reports are a near-perfect retrieval corpus: long, structured, written by experts, and full of exact facts that a model must not invent. This first paragraph gets the drop cap.

## Chunking by section

Each report already has findings, probable cause and recommendations, so those become the chunk boundaries. Inline `code` and a **bold claim** and a [link](https://example.com/).

```javascript
const response = await client.messages.create({ model: 'claude-opus-5-5', max_tokens: 4096, system: systemPrompt, messages: [{ role: 'user', content: question }], tools: [searchReports, fetchReport] });
// a comment
const n = 42;
```

### A long URL

https://www.ntsb.gov/investigations/AccidentReports/Reports/AAR2001-with-an-absurdly-long-path-segment-that-does-not-break-naturally.pdf

> If the answer can’t cite the paragraph, it isn’t an answer.

| Report | Year | Aircraft | Phase | Probable cause | Recommendations |
|---|---|---|---|---|---|
| AAR-01/02 | 2001 | MD-83 | Cruise | Jackscrew thread wear due to insufficient lubrication | 12 |
| AAR-10/03 | 2010 | A320 | Climb | Dual engine failure after bird ingestion | 34 |

![A wide office wall photo](media/kitchen-sink/wide.webp "A caption under a wide figure")

- A list item
- Another one with a footnote[^1]

1. First
2. Second

```
plain block without a language <b>&amp;
```

[^1]: The footnote text.
