#!/usr/bin/env bash
set -e

PLAN_FILE=".claude-task/plan.json"
SESSION="multi-agent"

if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: No plan found at $PLAN_FILE"
  echo "Run: pnpm plan \"your task\""
  exit 1
fi

SUBTASK_IDS=$(node -e "
  const p = JSON.parse(require('fs').readFileSync('$PLAN_FILE', 'utf-8'));
  console.log(p.subtasks.map(s => s.id).join('\n'));
")

SUBTASK_COUNT=$(node -e "
  const p = JSON.parse(require('fs').readFileSync('$PLAN_FILE', 'utf-8'));
  console.log(p.subtasks.length);
")

echo "Starting workflow: $SUBTASK_COUNT workers"

tmux kill-session -t "$SESSION" 2>/dev/null || true
tmux new-session -d -s "$SESSION" -x 220 -y 60
tmux rename-window -t "$SESSION" "workflow"

# Capture status pane ID (stable, index-independent)
STATUS_PANE=$(tmux list-panes -t "$SESSION:workflow" -F "#{pane_id}")

# Show plan summary in status pane
tmux send-keys -t "$STATUS_PANE" \
  "node -e \"const p=JSON.parse(require('fs').readFileSync('$PLAN_FILE','utf-8')); console.log('PLAN: '+p.task+'\n'); p.subtasks.forEach((s,i)=>console.log('  '+(i+1)+'. ['+s.model+'] '+s.id+' → '+s.branch))\"" \
  Enter

# Split off worker area (75% of height)
tmux split-window -t "$STATUS_PANE" -v -p 75
LAST_WORKER_PANE=$(tmux list-panes -t "$SESSION:workflow" -F "#{pane_id}" | tail -1)

# Launch workers — first uses existing pane, rest split horizontally
FIRST_WORKER=true
for ID in $SUBTASK_IDS; do
  PROMPT_FILE=".claude-task/${ID}.md"
  if [ ! -f "$PROMPT_FILE" ]; then
    echo "Warning: prompt file not found: $PROMPT_FILE — skipping $ID"
    continue
  fi

  if [ "$FIRST_WORKER" = true ]; then
    FIRST_WORKER=false
  else
    tmux split-window -t "$LAST_WORKER_PANE" -h
    LAST_WORKER_PANE=$(tmux list-panes -t "$SESSION:workflow" -F "#{pane_id}" | tail -1)
  fi

  tmux send-keys -t "$LAST_WORKER_PANE" \
    "echo '=== WORKER: $ID ===' && claude --print \"\$(cat $PROMPT_FILE)\" && echo '✓ DONE: $ID'" \
    Enter
done

# Reviewer pane at the bottom of the status area
tmux split-window -t "$STATUS_PANE" -v -p 20
REVIEWER_PANE=$(tmux list-panes -t "$SESSION:workflow" -F "#{pane_id}" | tail -1)
tmux send-keys -t "$REVIEWER_PANE" \
  "echo 'Waiting for all workers... run: pnpm review-merge when workers are done'" \
  Enter

tmux attach-session -t "$SESSION"
