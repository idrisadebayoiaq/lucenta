-- Rewriter "Suggestions" mode: feedback on a text without rewriting it (the only Rewriter mode students can use).
-- Suggestions are stored in text_checks.result; output_text stays empty because nothing is rewritten.

alter table public.text_checks drop constraint if exists text_checks_kind_check;
alter table public.text_checks add constraint text_checks_kind_check check (kind in ('detect', 'humanize', 'suggest'));
