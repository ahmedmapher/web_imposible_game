from flask import Flask, request, render_template, jsonify, session
import hmac
import hashlib
import os
import time
from functools import wraps

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET', 'dev_secret_for_sessions')

FLAG = os.environ.get('CTF_FLAG', 'flag{h4rdc0d3d_hm4c_s1gn4tur3_l34k}')
SIGN_SECRET = os.environ.get('SIGN_SECRET', 'console_leak_secret_321')

def require_json(f):
    @wraps(f)
    def inner(*args, **kwargs):
        data = request.get_json(force=True)
        return f(data, *args, **kwargs)
    return inner

@app.route('/')
def index():
    if 'balance' not in session:
        session['balance'] = 1000
    return render_template('index.html')

@app.route('/api/command', methods=['POST'])
@require_json
def api_command(data):
    cmd = data.get('cmd', '').strip()
    
    # Simple commands
    if cmd == 'balance':
        return jsonify({'status':'ok', 'balance': session.get('balance', 1000)})
    if cmd == 'price':
        return jsonify({'status':'ok', 'price': 1001000})
    if cmd == 'help':
        return jsonify({'status':'ok', 'help': ['balance','price','buy flag','work','help']})

    if cmd == 'work':
        last_work = session.get('last_work_time', 0)
        if time.time() - last_work < 20:
            return jsonify({
                'status': 'error', 
                'message': f"You're tired. Please wait {20 - (time.time() - last_work):.1f} more seconds."
            }), 429
        
        session['balance'] = session.get('balance', 0) + 1
        session['last_work_time'] = time.time()
        return jsonify({'status': 'ok', 'message': 'You worked hard and earned 1 credit.', 'balance': session['balance']})

    if cmd == 'buy flag':
        price = 1001000
        bal = session.get('balance', 0)
        if bal >= price:
            session['balance'] = bal - price
            return jsonify({'status':'ok', 'flag': FLAG})
        else:
            return jsonify({'status':'error', 'message':'Insufficient balance', 'balance': bal, 'price': price}), 400

    return jsonify({'status':'error', 'message':'Unknown command'}), 400

@app.route('/api/force_buy', methods=['POST'])
@require_json
def force_buy(data):
    name = data.get('name', '')
    signature = data.get('signature', '')

    if name != 'admin':
        return jsonify({'status':'error', 'message':'Access denied. Force-buy is for admin use only.'}), 403

    msg = f"admin:force_buy".encode()
    expected = hmac.new(SIGN_SECRET.encode(), msg, hashlib.sha256).hexdigest()
    
    if not hmac.compare_digest(expected, signature):
        return jsonify({'status':'error', 'message':'Invalid signature'}), 400
        
    return jsonify({'status':'ok', 'flag': FLAG})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)