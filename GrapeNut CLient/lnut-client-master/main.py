import sys
import os
import subprocess
from PyQt6.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton

# Function to open the respective files
def open_file(file_path):
    if file_path.endswith(".py"):
        subprocess.Popen(["python", file_path])  # Opens Python scripts
    else:
        os.startfile(file_path)  # Opens HTML or other files with default program

class App(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle('File Opener')
        self.setGeometry(100, 100, 300, 200)
        self.setStyleSheet("background-color: #f5f5f5; font-family: Arial, sans-serif; color: #333;")

        # Create buttons for file opening
        button1 = QPushButton("Open mathswatchai.py", self)
        button1.setStyleSheet("background-color: #009688; color: white; padding: 10px 15px; border: none; border-radius: 5px;")

        button2 = QPushButton("Open LanguageNutbooster.py", self)
        button2.setStyleSheet("background-color: #009688; color: white; padding: 10px 15px; border: none; border-radius: 5px;")

        button3 = QPushButton("Open index.html", self)
        button3.setStyleSheet("background-color: #009688; color: white; padding: 10px 15px; border: none; border-radius: 5px;")

        # Set button actions
        button1.clicked.connect(lambda: open_file(r"C:\Users\judof\Downloads\lnut-client-master\lnut-client-master\mathswatchai.py"))
        button2.clicked.connect(lambda: open_file(r"C:\Users\judof\Downloads\lnut-client-master\lnut-client-master\LanguageNutbooster.py"))
        button3.clicked.connect(lambda: open_file(r"C:\Users\judof\Downloads\lnut-client-master\lnut-client-master\index.html"))

        # Layout to place the buttons
        layout = QVBoxLayout()
        layout.addWidget(button1)
        layout.addWidget(button2)
        layout.addWidget(button3)

        # Set the layout of the main window
        self.setLayout(layout)


# Initialize the application and the window
app = QApplication(sys.argv)
window = App()
window.show()

# Run the application's event loop
sys.exit(app.exec())
