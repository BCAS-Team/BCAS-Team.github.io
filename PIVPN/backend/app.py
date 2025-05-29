from flask import Flask, render_template, redirect, url_for, request, flash
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user
from flask_bcrypt import Bcrypt
import sqlite3
import os
import socket
import subprocess

app = Flask(__name__, template_folder='../frontend')
app.secret_key = 'supersecretkey'

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

bcrypt = Bcrypt(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'users.db')

class User(UserMixin):
    def __init__(self, id_, username, password):
        self.id = id_
        self.username = username
        self.password = password

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@login_manager.user_loader
def load_user(user_id):
    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if user:
        return User(user['id'], user['username'], user['password'])
    return None

@app.route('/', methods=['GET'])
@login_required
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        conn = get_db_connection()
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        conn.close()
        if user and bcrypt.check_password_hash(user['password'], password):
            login_user(User(user['id'], user['username'], user['password']))
            return redirect(url_for('index'))
        else:
            flash("Invalid username or password", "danger")
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/vpn/start')
@login_required
def start_vpn():
    subprocess.call(['sudo', 'systemctl', 'start', 'openvpn@client'])
    return redirect(url_for('index'))

@app.route('/vpn/stop')
@login_required
def stop_vpn():
    subprocess.call(['sudo', 'systemctl', 'stop', 'openvpn@client'])
    return redirect(url_for('index'))

def create_user_table():
    conn = get_db_connection()
    conn.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )
    """)
    conn.commit()
    conn.close()

if __name__ == '__main__':
    create_user_table()
    app.run(debug=True)
