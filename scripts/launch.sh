#!/usr/bin/env bash
set -e

PLAN_FILE=".claude-task/plan.json"
SESSION="multi-agent"

if [ ! -f "$PLAN_FILE" ]; then
  echo "Error: No plan found at $PLAN_FILE"
  echo "Run: pnpm plan \"your task\""
  exit 1
fi

# Parse plan with node
SUBTASK_IDS=$(node -e "
  const p = JSON.parse(require('fs').readFileSync('$PLAN_FILE', 'utf-8'));
  console.log(p.subtasks.map(s => s.id).join('\n'));
")

SUBTASK_COUNT=$(node -e "
  const p = JSON.parse(require('fs').readFileSync('$PLAN_FILE', 'utf-8'));
  console.log(p.subtasks.length);
")

echo "Starting workflow: $SUBTASK_COUNT workers"

# Kill existing session
tmux kill-session -t "$SESSION" 2>/dev/null || true

# Create session — first pane is the status pane
tmux new-session -d -s "$SESSION" -x 220 -y 60

# Status pane (top): show plan summary
tmux rename-window -t "$SESSION:0" "workflow"
tmux send-keys -t "$SESSION:0" \
  "node -e \"const p=JSON.parse(require('fs').readFileSync('$PLAN_FILE','utf-8')); console.log('PLAN: '+p.task+'\n'); p.subtasks.forEach((s,i)=>console.log('  '+(i+1)+'. ['+s.model+'] '+s.id+' → '+s.branch))\"" \
  Enter

# Split status pane to make room for workers (workers take 75% of height)
tmux split-window -t "$SESSION:0" -v -p 75

# Worker panes: split the bottom area horizontally for each worker
FIRST_WORKER=true
PANE_IDX=1

for ID in $SUBTASK_IDS; do
  PROMPT_FILE=".claude-task/${ID}.md"
  if [ ! -f "$PROMPT_FILE" ]; then
    echo "Warning: prompt file not found: $PROMPT_FILE — skipping $ID"
    continue
  fi

  if [ "$FIRST_WORKER" = true ]; then
    FIRST_WORKER=false
    # First worker uses the bottom pane (index 1)
    tmux send-keys -t "$SESSION:0.$PANE_IDX" \
      "echo '=== WORKER: $ID ===' && claude --print \"\$(cat $PROMPT_FILE)\" && echo '✓ DONE: $ID'" \
      Enter
  else
    # Additional workers: split last worker pane horizontally
    tmux split-window -t "$SESSION:0.$PANE_IDX" -h
    PANE_IDX=$((PANE_IDX + 1))
    tmux send-keys -t "$SESSION:0.$PANE_IDX" \
      "echo '=== WORKER: $ID ===' && claude --print \"\$(cat $PROMPT_FILE)\" && echo '✓ DONE: $ID'" \
      Enter
  fi
done

# Reviewer pane: split off from status pane at the bottom
tmux split-window -t "$SESSION:0.0" -v -p 20
REVIEWER_PANE=$(tmux list-panes -t "$SESSION:0" -F "#{pane_index}" | tail -1)
tmux send-keys -t "$SESSION:0.$REVIEWER_PANE" \
  "echo 'Waiting for all workers... run: pnpm review-merge when workers are done'" \
  Enter

# Attach
tmux attach-session -t "$SESSION"
