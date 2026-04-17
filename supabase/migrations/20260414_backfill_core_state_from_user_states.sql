insert into public.study_sources (
  id,
  user_id,
  title,
  content,
  kind,
  extraction_status,
  question_generation_status,
  question_count,
  created_at,
  updated_at
)
select
  source.value->>'id' as id,
  user_states.user_id,
  coalesce(nullif(source.value->>'title', ''), 'Untitled notes') as title,
  coalesce(source.value->>'content', '') as content,
  coalesce(nullif(source.value->>'kind', ''), 'paste') as kind,
  coalesce(nullif(source.value->>'extractionStatus', ''), 'ready') as extraction_status,
  coalesce(nullif(source.value->>'questionGenerationStatus', ''), 'pending') as question_generation_status,
  coalesce(nullif(source.value->>'questionCount', '')::integer, 0) as question_count,
  coalesce((source.value->>'createdAt')::timestamptz, now()) as created_at,
  coalesce((source.value->>'updatedAt')::timestamptz, now()) as updated_at
from public.user_states
cross join lateral jsonb_each(coalesce(user_states.state->'sources', '{}'::jsonb)) as source(key, value)
on conflict (id) do update
set
  title = excluded.title,
  content = excluded.content,
  kind = excluded.kind,
  extraction_status = excluded.extraction_status,
  question_generation_status = excluded.question_generation_status,
  question_count = excluded.question_count,
  updated_at = excluded.updated_at;

insert into public.source_files (
  id,
  user_id,
  source_id,
  file_name,
  mime_type,
  size_bytes,
  extractor_mode,
  extraction_status,
  quality_score,
  created_at,
  updated_at
)
select
  source_file.value->>'id' as id,
  user_states.user_id,
  source_file.value->>'sourceId' as source_id,
  coalesce(nullif(source_file.value->>'fileName', ''), 'Uploaded file') as file_name,
  coalesce(source_file.value->>'mimeType', '') as mime_type,
  coalesce(nullif(source_file.value->>'size', '')::integer, 0) as size_bytes,
  coalesce(nullif(source_file.value->>'extractorMode', ''), 'direct') as extractor_mode,
  coalesce(nullif(source_file.value->>'extractionStatus', ''), 'ready') as extraction_status,
  coalesce(nullif(source_file.value->>'qualityScore', '')::numeric, 0) as quality_score,
  coalesce((source_file.value->>'createdAt')::timestamptz, now()) as created_at,
  coalesce((source_file.value->>'updatedAt')::timestamptz, now()) as updated_at
from public.user_states
cross join lateral jsonb_each(coalesce(user_states.state->'sourceFiles', '{}'::jsonb)) as source_file(key, value)
join public.study_sources on public.study_sources.id = source_file.value->>'sourceId' and public.study_sources.user_id = user_states.user_id
on conflict (id) do update
set
  source_id = excluded.source_id,
  file_name = excluded.file_name,
  mime_type = excluded.mime_type,
  size_bytes = excluded.size_bytes,
  extractor_mode = excluded.extractor_mode,
  extraction_status = excluded.extraction_status,
  quality_score = excluded.quality_score,
  updated_at = excluded.updated_at;

insert into public.extraction_runs (
  id,
  user_id,
  source_file_id,
  parser_path,
  ocr_used,
  duration_ms,
  quality_score,
  status,
  error_details,
  created_at
)
select
  extraction_run.value->>'id' as id,
  user_states.user_id,
  extraction_run.value->>'sourceFileId' as source_file_id,
  coalesce(nullif(extraction_run.value->>'parserPath', ''), 'pending') as parser_path,
  coalesce((extraction_run.value->>'ocrUsed')::boolean, false) as ocr_used,
  coalesce(nullif(extraction_run.value->>'durationMs', '')::integer, 0) as duration_ms,
  coalesce(nullif(extraction_run.value->>'qualityScore', '')::numeric, 0) as quality_score,
  coalesce(nullif(extraction_run.value->>'status', ''), 'ready') as status,
  nullif(extraction_run.value->>'errorDetails', '') as error_details,
  coalesce((extraction_run.value->>'createdAt')::timestamptz, now()) as created_at
from public.user_states
cross join lateral jsonb_each(coalesce(user_states.state->'extractionRuns', '{}'::jsonb)) as extraction_run(key, value)
join public.source_files on public.source_files.id = extraction_run.value->>'sourceFileId' and public.source_files.user_id = user_states.user_id
on conflict (id) do update
set
  source_file_id = excluded.source_file_id,
  parser_path = excluded.parser_path,
  ocr_used = excluded.ocr_used,
  duration_ms = excluded.duration_ms,
  quality_score = excluded.quality_score,
  status = excluded.status,
  error_details = excluded.error_details;

insert into public.study_questions (
  id,
  user_id,
  source_id,
  prompt,
  answer,
  status,
  created_at,
  updated_at
)
select
  question.value->>'id' as id,
  user_states.user_id,
  question.value->>'sourceId' as source_id,
  coalesce(question.value->>'prompt', '') as prompt,
  coalesce(question.value->>'answer', '') as answer,
  coalesce(nullif(question.value->>'status', ''), 'active') as status,
  coalesce((question.value->>'createdAt')::timestamptz, now()) as created_at,
  coalesce((question.value->>'updatedAt')::timestamptz, now()) as updated_at
from public.user_states
cross join lateral jsonb_each(coalesce(user_states.state->'questions', '{}'::jsonb)) as question(key, value)
join public.study_sources on public.study_sources.id = question.value->>'sourceId' and public.study_sources.user_id = user_states.user_id
on conflict (id) do update
set
  source_id = excluded.source_id,
  prompt = excluded.prompt,
  answer = excluded.answer,
  status = excluded.status,
  updated_at = excluded.updated_at;

insert into public.study_sessions (
  id,
  user_id,
  source_id,
  source_title,
  mode,
  started_at,
  ended_at,
  duration_seconds,
  question_cap,
  attempt_count,
  correct_count,
  incorrect_count,
  accuracy,
  time_cap_seconds,
  pointer,
  pending_retry_question_id,
  queue,
  created_at,
  updated_at
)
select
  session.value->>'id' as id,
  user_states.user_id,
  nullif(session.value->>'sourceId', '') as source_id,
  coalesce(study_sources.title, 'Study kit') as source_title,
  coalesce(nullif(session.value->>'mode', ''), 'standard') as mode,
  coalesce((session.value->>'startedAt')::timestamptz, now()) as started_at,
  (session.value->>'endedAt')::timestamptz as ended_at,
  0 as duration_seconds,
  coalesce(nullif(session.value->>'questionCap', '')::integer, 0) as question_cap,
  coalesce(nullif(session.value->>'answeredCount', '')::integer, 0) as attempt_count,
  0 as correct_count,
  0 as incorrect_count,
  0 as accuracy,
  coalesce(nullif(session.value->>'timeCapSeconds', '')::integer, 300) as time_cap_seconds,
  coalesce(nullif(session.value->>'pointer', '')::integer, 0) as pointer,
  nullif(session.value->>'pendingRetryQuestionId', '') as pending_retry_question_id,
  coalesce(session.value->'queue', '[]'::jsonb) as queue,
  coalesce((session.value->>'createdAt')::timestamptz, now()) as created_at,
  coalesce((session.value->>'updatedAt')::timestamptz, now()) as updated_at
from public.user_states
cross join lateral jsonb_each(coalesce(user_states.state->'sessions', '{}'::jsonb)) as session(key, value)
left join public.study_sources on public.study_sources.id = session.value->>'sourceId' and public.study_sources.user_id = user_states.user_id
on conflict (id) do update
set
  source_id = coalesce(excluded.source_id, public.study_sessions.source_id),
  source_title = case
    when public.study_sessions.source_title = 'Study kit' then excluded.source_title
    else public.study_sessions.source_title
  end,
  mode = coalesce(public.study_sessions.mode, excluded.mode),
  time_cap_seconds = excluded.time_cap_seconds,
  pointer = excluded.pointer,
  pending_retry_question_id = excluded.pending_retry_question_id,
  queue = excluded.queue,
  updated_at = greatest(public.study_sessions.updated_at, excluded.updated_at);

insert into public.session_attempts (
  id,
  user_id,
  session_id,
  question_id,
  source_id,
  source_title,
  prompt,
  answer,
  canonical_answer,
  outcome,
  is_retry,
  final,
  created_at
)
select
  attempt.value->>'id' as id,
  user_states.user_id,
  attempt.value->>'sessionId' as session_id,
  attempt.value->>'questionId' as question_id,
  study_questions.source_id,
  coalesce(study_sources.title, 'Study kit') as source_title,
  coalesce(study_questions.prompt, '') as prompt,
  coalesce(attempt.value->>'answer', '') as answer,
  coalesce(attempt.value->>'canonicalAnswer', '') as canonical_answer,
  coalesce(nullif(attempt.value->>'outcome', ''), 'incorrect') as outcome,
  coalesce((attempt.value->>'isRetry')::boolean, false) as is_retry,
  coalesce((attempt.value->>'final')::boolean, true) as final,
  coalesce((attempt.value->>'createdAt')::timestamptz, now()) as created_at
from public.user_states
cross join lateral jsonb_each(coalesce(user_states.state->'attempts', '{}'::jsonb)) as attempt(key, value)
join public.study_sessions on public.study_sessions.id = attempt.value->>'sessionId' and public.study_sessions.user_id = user_states.user_id
left join public.study_questions on public.study_questions.id = attempt.value->>'questionId' and public.study_questions.user_id = user_states.user_id
left join public.study_sources on public.study_sources.id = public.study_questions.source_id and public.study_sources.user_id = user_states.user_id
on conflict (id) do update
set
  session_id = excluded.session_id,
  question_id = excluded.question_id,
  source_id = excluded.source_id,
  source_title = excluded.source_title,
  prompt = excluded.prompt,
  answer = excluded.answer,
  canonical_answer = excluded.canonical_answer,
  outcome = excluded.outcome,
  is_retry = excluded.is_retry,
  final = excluded.final,
  created_at = excluded.created_at;

insert into public.question_progress (
  user_id,
  question_id,
  source_id,
  source_title,
  prompt,
  stability,
  difficulty,
  next_due_at,
  last_seen_at,
  recent_error_count,
  near_miss_count,
  retry_success_count,
  total_attempts,
  correct_attempts,
  last_outcome,
  mastery_score,
  pressure_score,
  updated_at
)
select
  user_states.user_id,
  review_state.value->>'questionId' as question_id,
  study_questions.source_id,
  coalesce(study_sources.title, 'Study kit') as source_title,
  coalesce(study_questions.prompt, '') as prompt,
  coalesce(nullif(review_state.value->>'stability', '')::numeric, 1) as stability,
  coalesce(nullif(review_state.value->>'difficulty', '')::numeric, 0.45) as difficulty,
  coalesce((review_state.value->>'nextDueAt')::timestamptz, now()) as next_due_at,
  (review_state.value->>'lastSeenAt')::timestamptz as last_seen_at,
  coalesce(nullif(review_state.value->>'recentErrorCount', '')::numeric, 0) as recent_error_count,
  coalesce(nullif(review_state.value->>'nearMissCount', '')::integer, 0) as near_miss_count,
  coalesce(nullif(review_state.value->>'retrySuccessCount', '')::integer, 0) as retry_success_count,
  coalesce(nullif(review_state.value->>'totalAttempts', '')::integer, 0) as total_attempts,
  coalesce(nullif(review_state.value->>'correctAttempts', '')::integer, 0) as correct_attempts,
  nullif(review_state.value->>'lastOutcome', '') as last_outcome,
  case
    when coalesce(nullif(review_state.value->>'totalAttempts', '')::integer, 0) > 0
      then round((coalesce(nullif(review_state.value->>'correctAttempts', '')::numeric, 0) / coalesce(nullif(review_state.value->>'totalAttempts', '')::numeric, 1)) * 100)::integer
    else 0
  end as mastery_score,
  coalesce(nullif(review_state.value->>'recentErrorCount', '')::numeric, 0) +
    (coalesce(nullif(review_state.value->>'nearMissCount', '')::numeric, 0) * 0.5) as pressure_score,
  now() as updated_at
from public.user_states
cross join lateral jsonb_each(coalesce(user_states.state->'reviewStates', '{}'::jsonb)) as review_state(key, value)
left join public.study_questions on public.study_questions.id = review_state.value->>'questionId' and public.study_questions.user_id = user_states.user_id
left join public.study_sources on public.study_sources.id = public.study_questions.source_id and public.study_sources.user_id = user_states.user_id
on conflict (user_id, question_id) do update
set
  source_id = excluded.source_id,
  source_title = excluded.source_title,
  prompt = excluded.prompt,
  stability = excluded.stability,
  difficulty = excluded.difficulty,
  next_due_at = excluded.next_due_at,
  last_seen_at = excluded.last_seen_at,
  recent_error_count = excluded.recent_error_count,
  near_miss_count = excluded.near_miss_count,
  retry_success_count = excluded.retry_success_count,
  total_attempts = excluded.total_attempts,
  correct_attempts = excluded.correct_attempts,
  last_outcome = excluded.last_outcome,
  mastery_score = excluded.mastery_score,
  pressure_score = excluded.pressure_score,
  updated_at = excluded.updated_at;
