# Output truth envelope

summarizeSales(dataset,{productId,period:{kind:"report",from,to}}) returns value, truthStatus, source, period, entity, matchingQuality, completeness, calculation and limitations.

truthStatus is COMPLETE, NO_DATA, INCOMPLETE, UNMATCHED, AMBIGUOUS or INVALID_INPUT. A numeric value appears only when selected facts validate, identities are exact, every amount is known, there are no duplicate IDs, and every selected source has observation coverage spanning the report period.

Null remains null; zero remains zero; returns remain negative. No rows yields NO_DATA/null. Unknown product yields UNMATCHED/null. Period gaps yield INCOMPLETE/null. Invalid event dates remain in the affected product scope and block complete totals. Plans never stand in for observations. Overflow yields CALCULATION_OVERFLOW/null.

Sources and coverage are caller assertions, not authenticated business truth. Arithmetic uses finite-number JavaScript addition without private rounding/currency rules; this is not a certified monetary accounting engine.

The original v0.1 salesSummary is a legacy schema-1 demonstration helper. New integrations should use schema 2 and this envelope.
