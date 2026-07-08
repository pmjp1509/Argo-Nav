-- Query logging for analytics / a future usage dashboard.
-- Extends app.query_history (created in schema.sql) with agent-level telemetry.
-- Run once in the Supabase SQL Editor.

alter table app.query_history add column if not exists tools_used        text[];
alter table app.query_history add column if not exists model             text;
alter table app.query_history add column if not exists prompt_tokens     int;
alter table app.query_history add column if not exists completion_tokens int;
alter table app.query_history add column if not exists error             text;

-- Handy analytics view (avg latency, SQL success, error rate per day)
create or replace view app.query_stats as
select
  date_trunc('day', created_at)                        as day,
  count(*)                                              as queries,
  round(avg(latency_ms))                               as avg_latency_ms,
  round(100.0 * avg((status = 'ok')::int), 1)          as ok_pct,
  round(100.0 * avg((generated_sql is not null)::int), 1) as sql_pct,
  sum(coalesce(prompt_tokens,0) + coalesce(completion_tokens,0)) as total_tokens
from app.query_history
group by 1
order by 1 desc;
