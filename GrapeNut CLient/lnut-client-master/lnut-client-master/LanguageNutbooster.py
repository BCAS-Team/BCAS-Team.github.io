import sys
import requests
from PyQt6.QtWidgets import (
    QApplication, QWidget, QLabel, QLineEdit,
    QPushButton, QVBoxLayout, QTextEdit, QMessageBox
)

class LanguagenutHack(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Languagenut Point Hacker")
        self.resize(500, 400)

        self.username = "WalkerJ"
        self.password = "Raven39168"
        self.token = ""
        self.score = 0

        self.initUI()

    def initUI(self):
        layout = QVBoxLayout()

        self.instructions_button = QPushButton("Show Instructions")
        self.instructions_button.clicked.connect(self.show_instructions)
        layout.addWidget(self.instructions_button)

        self.module_input = QLineEdit()
        self.module_input.setPlaceholderText("Enter module number (1000-40000)")
        layout.addWidget(self.module_input)

        self.points_input = QLineEdit()
        self.points_input.setPlaceholderText("Enter points to earn")
        layout.addWidget(self.points_input)

        self.start_button = QPushButton("Start Hack")
        self.start_button.clicked.connect(self.start_hack)
        layout.addWidget(self.start_button)

        self.log_output = QTextEdit()
        self.log_output.setReadOnly(True)
        layout.addWidget(self.log_output)

        self.setLayout(layout)

    def show_instructions(self):
        instructions = (
            "1. Enter your username and password to Languagenut.\n"
            "2. Enter a number between 1000 and 40000 for the lesson.\n"
            "3. Enter how many points you would like to earn.\n"
            "4. Click 'Start Hack' and wait."
        )
        QMessageBox.information(self, "Instructions", instructions)

    def log(self, text):
        self.log_output.append(text)

    def authenticate(self):
        url = 'https://api.languagenut.com/loginController/attemptlogin?cacheBreaker=1621610672902'
        body = f'username={self.username}&pass={self.password}&languagenutTimeMarker=1621610672902&lastLanguagenutTimeMarker=1621610672902&apiVersion=8'
        headers = {
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Origin': 'https://www.languagenut.com',
            'Referer': 'https://www.languagenut.com/'
        }

        try:
            response = requests.post(url, data=body, headers=headers)
            data = response.json()
            self.token = data.get('newToken')
            if not self.token:
                raise Exception("Token not received.")
            return True
        except Exception as e:
            self.log(f"Login failed: {e}")
            return False

    def start_hack(self):
        try:
            number = int(self.module_input.text())
            target_points = int(self.points_input.text())
        except ValueError:
            self.log("Please enter valid numbers.")
            return

        if not self.authenticate():
            return

        self.log("Login successful. Starting hack...")
        self.score = 0
        run = True

        while run:
            for _ in range(7):
                if self.score >= target_points:
                    run = False
                    break

                body = (
                    f'moduleUid={number}&gameUid=10&gameType=reading&isTest=true&toietf=es&fromietf=en-GB'
                    f'&score=3800&correctVocabs=26097%2C27666%2C26090%2C26091%2C26093%2C27662%2C26094%2C26095%2C26089%2C26096'
                    f'&incorrectVocabs=&isSentence=false&isVerb=false&grammarCatalogUid=12116&isGrammar=false'
                    f'&isExam=false&timeStamp=39250&vocabNumber=19&languagenutTimeMarker=1621543527060'
                    f'&lastLanguagenutTimeMarker=1621543527060&apiVersion=8&token={self.token}'
                )

                url = 'https://api.languagenut.com:443/gameDataController/addGameScore?cacheBreaker=1621543527060'
                headers = {
                    'User-Agent': 'Mozilla/5.0',
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Origin': 'https://www.languagenut.com',
                    'Referer': 'https://www.languagenut.com/'
                }

                x = requests.post(url, data=body, headers=headers)

                if 'Fatal' in x.text:
                    self.log(f"Invalid module number: {number}")
                    return
                if 'Error' in x.text:
                    self.log("Invalid token or session expired.")
                    return

                self.score += 3800
                percent = round(min((self.score / target_points) * 100, 100), 2)
                self.log_output.setPlainText(f"{self.score}/{target_points} points - {percent}%")

            number += 1

        self.log("")
        self.log("Hack complete!")
        self.log(f"You have earned {self.score} points!")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = LanguagenutHack()
    window.show()
    sys.exit(app.exec())
