import logging
import os
from datetime import datetime
from colorama import Fore, Style, init
import sys
import traceback
import threading
import inspect  # Import inspect module

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

# Override threading's excepthook for all threads


def custom_thread_excepthook(args):
    # return
    exc_type, exc_value, exc_traceback, thread = args
    log_uncaught_exceptions(exc_type, exc_value, exc_traceback)


# Apply the custom handler to all new threads
threading.excepthook = custom_thread_excepthook


class CustomLogger(logging.Logger):
    def makeRecord(self, name, level, fn, lno, msg, args, exc_info, func=None, extra=None, sinfo=None):
        """Automatically extract the correct class name and function name."""

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


def getLogger(name, class_name=None):
    """Create or retrieve a logger with console and file handlers."""

    if class_name:
        name = name + "%20" + class_name

    logger = logging.getLogger(name)

    console_level = logging.INFO

    log_dump_level = os.getenv("LOG_DUMP_LEVEL")

    if not log_dump_level:
        print("log_dump_level is not defined")
        exit()

    try:
        file_level = {
            "debug": logging.DEBUG,
            "info": logging.INFO,
            "warning": logging.WARNING,
            "error": logging.ERROR,
            "critical": logging.CRITICAL
        }[log_dump_level]
    except:
        print(
            f"LOG_DUMP_LEVEL can only be 'debug', 'info', 'warning', 'error' or 'critical' found '{log_dump_level}'")
        exit()

    # Avoid adding duplicate handlers
    if logger.hasHandlers():
        return logger

    # Ensure log directory exists
    log_dir = os.getenv("LOGS_PATH")

    if not log_dir:
        print("log_dir is not defined")
        exit()

    ensure_dir_exists(log_dir)

    # Set logging level
    logger.setLevel(min(console_level, file_level))

    # Define formatters
    plain_formatter = logging.Formatter(
        '{asctime} [{levelname:^10}] {name}.{classname}{funcName} - {message}',
        style="{",
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    color_formatter = ColorFormatter(
        '{asctime} [{levelname:^10}] {name}.{classname}{funcName} - {message}',
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
