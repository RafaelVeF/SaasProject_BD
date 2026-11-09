#!/bin/bash
set -e

OUTPUT_ZIP="td1-saas-kanban.zip"

echo "=== Génération de l'archive de livraison : ${OUTPUT_ZIP} ==="

python3 - << 'EOF'
import os
import zipfile

output_zip = "td1-saas-kanban.zip"
if os.path.exists(output_zip):
    os.remove(output_zip)

files_and_dirs = [
    "Dockerfile",
    "compose.yml",
    "docker-compose.yml",
    "config.env",
    "package.json",
    "package-lock.json",
    "server.js",
    "public",
    "src",
    "README.md",
    "SPEC_TECHNIQUE.md",
    "SPEC_FONCTIONNELLE.md",
    "Architecture_BD.md",
    "Architecture_Fonctionnelle.md"
]

with zipfile.ZipFile(output_zip, "w", zipfile.ZIP_DEFLATED) as z:
    for item in files_and_dirs:
        if os.path.isfile(item):
            z.write(item, item)
            print(f"  Ajouté : {item}")
        elif os.path.isdir(item):
            for root, dirs, files in os.walk(item):
                for f in files:
                    if f == ".DS_Store":
                        continue
                    full_path = os.path.join(root, f)
                    rel_path = os.path.relpath(full_path, ".")
                    z.write(full_path, rel_path)
                    print(f"  Ajouté : {rel_path}")

print(f"\nArchive {output_zip} générée avec succès !")
EOF

ls -lh "${OUTPUT_ZIP}"
