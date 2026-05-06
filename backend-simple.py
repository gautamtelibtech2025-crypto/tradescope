#!/usr/bin/env python3
"""
Simple Python backend for FYERS token exchange
Run: python backend-simple.py
"""
from flask import Flask, request, jsonify
import subprocess
import sys
import os

app = Flask(__name__)

PYTHON_SCRIPT = os.path.join(os.path.dirname(__file__), 'scripts', 'fyers_token.py')

@app.route('/exchange', methods=['POST'])
def exchange():
    """Exchange auth code for FYERS tokens"""
    try:
        body = request.get_json(force=True)
    except:
        return jsonify({'success': False, 'message': 'Invalid JSON'}), 400

    auth_code = (body.get('auth_code') or body.get('code') or '').strip()
    app_id = (body.get('app_id') or '').strip()
    secret_id = (body.get('secret_id') or '').strip()

    if not auth_code or not app_id or not secret_id:
        return jsonify({'success': False, 'message': 'auth_code, app_id, secret_id required'}), 400

    # Run Python script
    cmd = [sys.executable, PYTHON_SCRIPT, '--auth-code', auth_code, '--app-id', app_id, '--secret-id', secret_id, '--print-json']
    
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    except subprocess.TimeoutExpired:
        return jsonify({'success': False, 'message': 'Script timeout'}), 504
    except Exception as e:
        return jsonify({'success': False, 'message': f'Script error: {str(e)}'}), 500

    if proc.returncode != 0:
        return jsonify({'success': False, 'message': 'Python error', 'stderr': proc.stderr or ''}), 500

    # Parse output
    out = proc.stdout.strip()
    try:
        import json
        for line in out.splitlines():
            if line.strip().startswith('{'):
                data = json.loads(line)
                return jsonify(data)
        data = json.loads(out)
        return jsonify(data)
    except:
        return jsonify({'success': False, 'message': 'Invalid output', 'output': out}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    print(f"🚀 Backend running on port {port}")
    print(f"📍 POST /exchange - Token exchange endpoint")
    app.run(host='0.0.0.0', port=port, debug=True)
