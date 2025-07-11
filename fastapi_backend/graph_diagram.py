from app.core.services.agent.graph import graph
import os
import subprocess

# Generate the graph image
png_data = graph.get_graph().draw_mermaid_png()

# Save to file
output_path = os.path.join(os.getcwd(), 'graph_diagram.png')
with open(output_path, 'wb') as f:
    f.write(png_data)

print(f"Graph diagram saved to: {output_path}")

# Open the image file with the default viewer
try:
    if os.name == 'nt':  # Windows
        os.startfile(output_path)
    elif os.name == 'posix':  # macOS and Linux
        if os.uname().sysname == 'Darwin':  # macOS
            subprocess.call(['open', output_path])
        else:  # Linux
            subprocess.call(['xdg-open', output_path])
    print("Image opened in default viewer")
except Exception as e:
    print(f"Could not open the image automatically: {e}")