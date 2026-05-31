#!/usr/bin/env bash
set -euo pipefail

# Create a local virtualenv in backend/.venv and install requirements
PYTHON=${1:-python3}
VENV_DIR="$(dirname "$0")/.venv"

echo "Creating virtualenv at ${VENV_DIR} using ${PYTHON}..."
${PYTHON} -m venv "${VENV_DIR}"
"${VENV_DIR}/bin/python" -m pip install --upgrade pip
"${VENV_DIR}/bin/python" -m pip install -r "$(dirname "$0")/requirements.txt"

echo "Virtualenv ready. To use it locally:"
echo "  source ${VENV_DIR}/bin/activate"
echo "Or run commands directly: ${VENV_DIR}/bin/python script.py"

