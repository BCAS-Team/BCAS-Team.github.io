import sys
import io
import pygetwindow as gw
import pyautogui
from PIL import Image
from PyQt6.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QLabel,
    QPushButton, QComboBox, QTextEdit, QHBoxLayout
)
from PyQt6.QtCore import Qt
import google.generativeai as genai

# ===== Set your Gemini API Key here =====
API_KEY = "Put YOUR gemini API key here"
genai.configure(api_key=API_KEY)

model = genai.GenerativeModel('gemini-2.0-flash')


class GeminiImageAnalyzer(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Gemini Math Answer Finder")
        self.setFixedSize(600, 420)

        # Always-on-top, floating, non-intrusive
        self.setWindowFlags(
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.Tool |
            Qt.WindowType.Window
        )

        # Stick to top-right corner
        screen = QApplication.primaryScreen().availableGeometry()
        self.move(screen.width() - self.width(), 0)

        # UI Layout
        layout = QVBoxLayout()

        self.combo = QComboBox()
        self.refresh_window_list()
        layout.addWidget(QLabel("Select Window to Capture:"))
        layout.addWidget(self.combo)

        btn_layout = QHBoxLayout()
        self.capture_btn = QPushButton("Capture & Get Answer")
        self.capture_btn.clicked.connect(self.capture_and_analyze)
        btn_layout.addWidget(self.capture_btn)

        self.clear_btn = QPushButton("Clear")
        self.clear_btn.clicked.connect(self.clear_text)
        btn_layout.addWidget(self.clear_btn)

        layout.addLayout(btn_layout)

        self.result_box = QTextEdit()
        self.result_box.setReadOnly(True)
        layout.addWidget(QLabel("Answer:"))
        layout.addWidget(self.result_box)

        self.setLayout(layout)

    def refresh_window_list(self):
        self.combo.clear()
        windows = gw.getWindowsWithTitle("")
        self.windows = {w.title: w for w in windows if w.title.strip()}
        self.combo.addItems(self.windows.keys())

    def capture_and_analyze(self):
        title = self.combo.currentText()
        window = self.windows[title]

        try:
            window.activate()
            window.maximize()
            pyautogui.sleep(1)

            bbox = (window.left, window.top, window.left + window.width, window.top + window.height)
            screenshot = pyautogui.screenshot(region=bbox)

            # Convert screenshot to bytes
            img_bytes_io = io.BytesIO()
            screenshot.save(img_bytes_io, format="PNG")
            img_bytes = img_bytes_io.getvalue()

            # Just ask for the final answer
            prompt = "What is the answer to the equation(s) in this image? make sure to check closely, do not explain the equation, just put the answers in a list. Then Run 3 extra Checks to confirm the Question text, and the answer is absoultely correct."

            response = model.generate_content([
                {"mime_type": "image/png", "data": img_bytes},
                prompt
            ])

            self.result_box.setText(response.text.strip())

        except Exception as e:
            self.result_box.setText(f"Error: {e}")

    def clear_text(self):
        self.result_box.clear()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = GeminiImageAnalyzer()
    window.show()
    sys.exit(app.exec())
