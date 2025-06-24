#!/bin/bash
cd /home/kavia/workspace/code-generation/reactfasttictactoe-33457-f96b7456/tic_tac_toe_backend_workspace/tic_tac_toe_backend
source venv/bin/activate
flake8 .
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

