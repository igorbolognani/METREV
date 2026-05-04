# Research Notes - Logged-In UI And Admin Separation

## Verified repository facts

- The backend already exposes real big-data and research machinery: bootstrap scripts, source-document warehouse growth, evidence review, research tables, extraction jobs, evidence packs, and a dedicated research worker.
- The current usability problem is mostly in the signed-in UI composition, not in the absence of runtime evidence infrastructure.
- The stack configurator previously placed a long preset deck above the step navigator inside the support column, which created the scroll loop reported by the user.
- The signed-in route registry already distinguishes primary and advanced surfaces at the data level, but the UI wording is still too weak to read as a strict client/admin separation.

## Implication for the first slice

The first implementation slice should fix presentation and navigation before promising deeper automation. The right message is: the intelligence runtime exists, but the UI must stop hiding the boundary between input, post-submit output, and internal/admin data operations.
