from flask import Flask, request, jsonify
import subprocess
import os
import sys
import shlex

app = Flask(__name__)

SCRIPT_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scripts', 'fyers_token.py'))

@app.route('/exchange', methods=['POST'])
def exchange_token():
    try:
        body = request.get_json(force=True)
    except Exception as e:
        return jsonify({'success': False, 'message': 'Invalid JSON', 'error': str(e)}), 400

    auth_code = (body.get('auth_code') or body.get('code') or '').strip()
    app_id = (body.get('app_id') or '').strip()
    secret_id = (body.get('secret_id') or '').strip()

    if not auth_code:
        return jsonify({'success': False, 'message': 'auth_code is required'}), 400
    if not app_id or not secret_id:
        return jsonify({'success': False, 'message': 'app_id and secret_id are required'}), 400

    cmd = [sys.executable, SCRIPT_PATH, '--auth-code', auth_code, '--app-id', app_id, '--secret-id', secret_id, '--print-json']
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'message': 'Python script timed out'}), 504
    except Exception as e:
        return jsonify({'success': False, 'message': 'Failed to run Python script', 'error': str(e)}), 500

    if proc.returncode != 0:
        return jsonify({'success': False, 'message': 'Python script error', 'stderr': proc.stderr or ''}), 500

    out = proc.stdout.strip()
    # The script prints JSON; try to locate the JSON substring
    try:
        import json
        # If multiple lines, take first JSON-looking line
        for line in out.splitlines():
            line = line.strip()
            if line.startswith('{'):
                data = json.loads(line)
                return jsonify(data)
        # fallback: parse whole output
        data = json.loads(out)
        return jsonify(data)
    except Exception as e:
        return jsonify({'success': False, 'message': 'Invalid JSON from script', 'output': out, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '8000'))
    app.run(host='0.0.0.0', port=port)
