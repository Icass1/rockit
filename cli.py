# cli_app.py
from prompt_toolkit import PromptSession
from prompt_toolkit.completion import WordCompleter
from prompt_toolkit.application import Application
from prompt_toolkit.key_binding import KeyBindings
from prompt_toolkit.layout import Layout
from prompt_toolkit.layout.containers import HSplit, Window
from prompt_toolkit.layout.controls import FormattedTextControl

# Define all commands
commands = [
    "api-get album", "api-get song", "api-get playlist", "api-get artist",
    "delete album", "delete song", "delete playlist"
]

# Autocompleter
command_completer = WordCompleter(commands, ignore_case=True, sentence=True)

# History/output text
output_lines = ["Welcome to CLI App!", "Type a command below."]

def get_output_text():
    return "\n".join(output_lines)

# Key bindings
kb = KeyBindings()

@kb.add("c-c")
def _(event):
    """Exit with Ctrl+C."""
    event.app.exit()

# Main UI Layout
body = Window(content=FormattedTextControl(get_output_text), wrap_lines=True)
session = PromptSession(completer=command_completer)

def run_command(command: str):
    output_lines.append(f"> {command}")




    # Here you'd implement your logic for the commands
    if command.startswith("api-get album"):
        output_lines.append(f"Fetching album {command.split()[-1]}...")
    elif command.startswith("delete album"):
        output_lines.append(f"Deleting album {command.split()[-1]}...")
    else:
        output_lines.append("Unknown command!")

async def app():
    from prompt_toolkit.patch_stdout import patch_stdout
    app = Application(
        layout=Layout(HSplit([body])),
        key_bindings=kb,
        full_screen=True
    )
    with patch_stdout():
        while True:
            try:
                command = await session.prompt_async("> ")
                run_command(command)
                body.content.text = get_output_text()
            except (EOFError, KeyboardInterrupt):
                break
    print("Goodbye!")

if __name__ == "__main__":
    import asyncio
    asyncio.run(app())
