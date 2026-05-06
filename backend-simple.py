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

    print(f"\n📥 Exchange request received:")
    print(f"  App ID: {app_id}")
    print(f"  Secret ID: {secret_id[:20]}..." if len(secret_id) > 20 else f"  Secret ID: {secret_id}")
    print(f"  Auth Code: {auth_code[:30]}..." if len(auth_code) > 30 else f"  Auth Code: {auth_code}")

    if not auth_code or not app_id or not secret_id:
        msg = 'Missing: ' + ', '.join([k for k, v in [('auth_code', auth_code), ('app_id', app_id), ('secret_id', secret_id)] if not v])
        print(f"❌ {msg}")
        return jsonify({'success': False, 'message': msg}), 400

    # Run Python script
    cmd = [sys.executable, PYTHON_SCRIPT, '--auth-code', auth_code, '--app-id', app_id, '--secret-id', secret_id, '--print-json']
    print(f"🔧 Running: {' '.join(cmd[:3])} ...")
    
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
    except subprocess.TimeoutExpired:
        print("❌ Script timeout")
        return jsonify({'success': False, 'message': 'Script timeout'}), 504
    except Exception as e:
        print(f"❌ Script exception: {str(e)}")
        return jsonify({'success': False, 'message': f'Script error: {str(e)}'}), 500

    if proc.returncode != 0:
        stderr_msg = proc.stderr or 'Unknown error'
        print(f"❌ Python script failed: {stderr_msg}")
        return jsonify({'success': False, 'message': f'Python error: {stderr_msg}'}), 500

    # Parse output
    out = proc.stdout.strip()
    print(f"📤 Python script output: {out}")
    try:
        import json
        for line in out.splitlines():
            if line.strip().startswith('{'):
                data = json.loads(line)
                print(f"✅ Parsed: {data}")
                return jsonify(data)
        data = json.loads(out)
        print(f"✅ Parsed: {data}")
        return jsonify(data)
    except Exception as e:
        print(f"❌ Parse error: {str(e)}")
        return jsonify({'success': False, 'message': f'Parse error: {str(e)}', 'output': out}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', '5000'))
    print(f"🚀 Backend running on port {port}")
    print(f"📍 POST /exchange - Token exchange endpoint")
    app.run(host='0.0.0.0', port=port, debug=True)
