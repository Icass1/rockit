from pathlib import Path


in_ = Path("vocab.txt")
out_ = Path("vocab2.txt")


content = in_.read_text()

output_content: list[str] = []

for line in content.split("\n"):
    parts = line.split("	")

    output_content.append(f"{parts[0].upper()}	{parts[1]}")


out_.write_text("\n".join(output_content))
