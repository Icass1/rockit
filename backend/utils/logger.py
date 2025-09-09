import os
import sys
import logging
import traceback
import threading
from datetime import datetime
from colorama import Fore, Style, init

# Import inspect module
from backend.constants import CONSOLE_DUMP_LEVEL, LOG_DUMP_LEVEL, LOGS_PATH

LEVELS = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warning": logging.WARNING,
    "error": logging.ERROR,
    "critical": logging.CRITICAL
}


class CustomLogger(logging.Logger):
    def makeRecord(self, name, level, fn, lno, msg, args, exc_info, func=None, extra=None, sinfo=None):
        """Automatically extract the correct class name and function name."""

        # print(name, level, fn, lno, msg, args, exc_info, func, extra, sinfo)

        if extra is None:
            extra = {}

        extra["classname"] = ""  # type: ignore

        if "%20" in name:
            split_name = name.split("%20")
            name = split_name[0]
            class_name = split_name[1]
            extra["classname"] = class_name + "."  # type: ignore

        return super().makeRecord(name, level, fn, lno, msg, args, exc_info, func, extra, sinfo)


# Override the default logger class
logging.setLoggerClass(CustomLogger)


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


def ensure_dir_exists(path):
    """Ensure the directory for logs exists."""
    if not os.path.exists(path):
        os.makedirs(path)


def log_uncaught_exceptions(exc_type, exc_value, exc_traceback):
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

    logger = getLogger("Uncaught Exceptions")
    logger.critical(formatted_message)


def custom_thread_excepthook(args):
    """Override threading's excepthook for all threads"""
    exc_type, exc_value, exc_traceback, thread = args
    log_uncaught_exceptions(exc_type, exc_value, exc_traceback)


def getLogger(name, class_name=None):
    """Create or retrieve a logger with console and file handlers."""

    if class_name:
        name = name + "%20" + class_name

    logger = logging.getLogger(name)

    try:
        file_level = LEVELS[LOG_DUMP_LEVEL]
    except:
        print(
            f"LOG_DUMP_LEVEL can only be 'debug', 'info', 'warning', 'error' or 'critical' found '{LOG_DUMP_LEVEL}'")
        exit()

    try:
        console_level = LEVELS[CONSOLE_DUMP_LEVEL]
    except:
        print(
            f"LOG_DUMP_LEVEL can only be 'debug', 'info', 'warning', 'error' or 'critical' found '{LOG_DUMP_LEVEL}'")
        exit()

    # Avoid adding duplicate handlers
    if logger.hasHandlers():
        return logger

    # Set logging level
    logger.setLevel(console_level)

    # Define formatters
    plain_formatter = logging.Formatter(
        '{asctime} [{levelname:^10}] {pathname}:{lineno} - {name}.{classname}{funcName} - {message}',
        style="{",
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    color_formatter = ColorFormatter(
        '{asctime} [{levelname:^10}] {pathname}:{lineno} - {message}',
        style="{",
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # Console handler with colors
    console_handler = logging.StreamHandler()
    console_handler.setLevel(console_level)
    console_handler.setFormatter(color_formatter)

    # File handler with plain formatting
    file_handler = logging.FileHandler(log_file, mode="a")
    file_handler.setLevel(file_level)
    file_handler.setFormatter(plain_formatter)

    # Add handlers to logger
    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger


# Initialize Colorama for cross-platform compatibility
init(autoreset=True)

ensure_dir_exists(LOGS_PATH)

list_dir = os.listdir(LOGS_PATH)
list_dir.sort()

while len(list_dir) > 10:
    os.remove(os.path.join(LOGS_PATH, list_dir[0]))
    list_dir.pop(0)

current_time = datetime.now().strftime('%Y-%m-%d_%H-%M')
log_file = os.path.join(LOGS_PATH, f"log_{current_time}.log")

if os.path.exists(log_file):
    print("Removing previous log")
    os.remove(log_file)


# Apply the custom handler to all new threads
threading.excepthook = custom_thread_excepthook

sys.excepthook = log_uncaught_exceptions
