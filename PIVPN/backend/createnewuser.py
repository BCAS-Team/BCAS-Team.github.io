import sqlite3
from flask_bcrypt import Bcrypt

bcrypt = Bcrypt()

conn = sqlite3.connect('users.db')
conn.execute("""
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
)
""")
username = input("Enter username: ")
password = input("Enter password: ")
hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

try:
    conn.execute("INSERT INTO users (username, password) VALUES (?, ?)", (username, hashed_pw))
    conn.commit()
    print("User created successfully.")
except sqlite3.IntegrityError:
    print("Username already exists.")
conn.close()
