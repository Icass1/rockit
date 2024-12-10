import logging
import os
from datetime import datetime
from colorama import Fore, Style, init
import sys
import traceback
import threading

# Initialize Colorama for cross-platform compatibility
init(autoreset=True)

def ensure_dir_exists(path):
    """Ensure the directory for logs exists."""
    if not os.path.exists(path):
        os.makedirs(path)

class ColorFormatter(logging.Formatter):
    """Custom formatter to add colors to log levels."""
    COLORS = {
        'DEBUG': Fore.BLUE,
        'INFO': Fore.GREEN,
        'WARNING': Fore.YELLOW,
        'ERROR': Fore.RED,
        'CRITICAL': Fore.MAGENTA + Style.BRIGHT
    }

    def format(self, record):
        log_color = self.COLORS.get(record.levelname, "")
        message = super().format(record)
        return f"{log_color}{message}{Style.RESET_ALL}"

def log_uncaught_exceptions(exc_type, exc_value, exc_traceback: traceback):
    """Log uncaught exceptions."""
    if issubclass(exc_type, KeyboardInterrupt):
        # Allow KeyboardInterrupt to exit gracefully
        sys.__excepthook__(exc_type, exc_value, exc_traceback)
        return
    

    tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
    
    # Combine the traceback into a single string
    error_message = ''.join(tb_lines)

    # Optionally, you can also include the exception type and value
    formatted_message = "\n"
    formatted_message += f"Exception Type: {exc_type.__name__}\n"
    formatted_message += f"Exception Value: {exc_value}\n"
    formatted_message += "Traceback:\n"
    formatted_message += error_message

    # print("============= exc_value =============")
    # help(exc_value)
    # print("============= exc_type =============")
    # help(exc_type)
    # print("============= exc_traceback =============")
    # help(exc_traceback)
    # print("============= ========= =============")




    logger = getLogger("Uncaught Exceptions")
    logger.critical(formatted_message)

# Override threading's excepthook for all threads
def custom_thread_excepthook(args):
    # return
    exc_type, exc_value, exc_traceback, thread = args
    log_uncaught_exceptions(exc_type, exc_value, exc_traceback)

# Apply the custom handler to all new threads
threading.excepthook = custom_thread_excepthook

def getLogger(name):
    """Create or retrieve a logger with console and file handlers."""
    logger = logging.getLogger(name)

    console_level = logging.INFO
    file_level = logging.DEBUG

    # Avoid adding duplicate handlers
    if logger.hasHandlers():
        return logger

    # Ensure log directory exists
    log_dir = os.getenv("LOGS_PATH")

    ensure_dir_exists(log_dir)

    # Set logging level
    logger.setLevel(logging.DEBUG)

    # Define formatters
    plain_formatter = logging.Formatter(
        '{asctime} [{levelname:^10}]  {name}  {message}', 
        style="{", 
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    color_formatter = ColorFormatter(
        '{asctime} [{levelname:^10}]  {name}  {message}', 
        style="{", 
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler with colors
    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_level)
    console_handler.setFormatter(color_formatter)

    # File handler with plain formatting
    current_time = datetime.now().strftime('%Y-%m-%d_%H-%M')
    log_file = os.path.join(log_dir, f"log_{current_time}.log")
    file_handler = logging.FileHandler(log_file, mode="a")
    file_handler.setLevel(file_level)
    file_handler.setFormatter(plain_formatter)

    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger

sys.excepthook = log_uncaught_exceptions
