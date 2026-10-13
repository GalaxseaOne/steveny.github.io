#!/usr/bin/env python3
"""
PenTest Hub — Companion Server
Exécute les commandes depuis le hub web et stream l'output en temps réel.

Usage:
    pip install flask flask-cors
    python3 hub-companion.py

Le serveur écoute sur http://localhost:7373
"""

from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import subprocess
import shlex
import json
import sys

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Commandes autorisées (sécurité : pas d'exécution arbitraire)
ALLOWED_CMDS = {
    'nmap', 'hydra', 'sqlmap', 'john', 'hashcat', 'nikto',
    'gobuster', 'feroxbuster', 'ffuf', 'dirb',
    'theHarvester', 'theharvester',
    'enum4linux', 'enum4linux-ng',
    'smbclient', 'smbmap', 'crackmapexec', 'cme',
    'airmon-ng', 'airodump-ng', 'aireplay-ng', 'aircrack-ng',
    'hcxdumptool', 'hcxpcapngtool',
    'whois', 'host', 'dig', 'nslookup',
    'nc', 'ncat', 'netcat',
    'amass', 'subfinder', 'assetfinder',
    'msfvenom', 'burpsuite',
    'tshark', 'tcpdump',
    'ssh2john', 'zip2john', 'rar2john', 'pdf2john', 'keepass2john', 'office2john',
    'unshadow',
}


@app.route('/status')
def status():
    return jsonify({'status': 'ok', 'version': '1.0', 'name': 'PenTest Hub Companion'})


@app.route('/run', methods=['POST'])
def run():
    data = request.get_json(force=True)
    cmd = (data.get('cmd') or '').strip()

    if not cmd:
        return jsonify({'error': 'Commande vide'}), 400

    try:
        parts = shlex.split(cmd)
    except ValueError as e:
        return jsonify({'error': f'Commande invalide : {e}'}), 400

    cmd_name = parts[0].split('/')[-1]  # gère les chemins absolus
    if cmd_name not in ALLOWED_CMDS:
        return jsonify({'error': f'Commande non autorisée : {cmd_name}'}), 403

    def generate():
        yield f"data: {json.dumps({'info': f'$ {cmd}'})}\n\n"
        try:
            proc = subprocess.Popen(
                parts,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
            )
            for line in proc.stdout:
                yield f"data: {json.dumps({'line': line.rstrip()})}\n\n"
            proc.wait()
            yield f"data: {json.dumps({'done': True, 'code': proc.returncode})}\n\n"
        except FileNotFoundError:
            yield f"data: {json.dumps({'error': f'{cmd_name} : commande introuvable. Est-elle installée ?'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return Response(
        generate(),
        content_type='text/event-stream',
        headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'},
    )


if __name__ == '__main__':
    print('\033[32m')
    print('  ██████╗ ███████╗███╗   ██╗████████╗███████╗███████╗████████╗')
    print('  ██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██╔════╝██╔════╝╚══██╔══╝')
    print('  ██████╔╝█████╗  ██╔██╗ ██║   ██║   █████╗  ███████╗   ██║')
    print('  ██╔═══╝ ██╔══╝  ██║╚██╗██║   ██║   ██╔══╝  ╚════██║   ██║')
    print('  ██║     ███████╗██║ ╚████║   ██║   ███████╗███████║   ██║')
    print('  ╚═╝     ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝   ╚═╝')
    print('\033[0m')
    print('  \033[36mPenTest Hub Companion v1.0\033[0m')
    print(f'  Écoute sur \033[33mhttp://localhost:7373\033[0m')
    print('  Ouvre le hub dans ton navigateur et clique \033[32m▶ Lancer\033[0m')
    print('  Ctrl+C pour arrêter\n')
    try:
        app.run(host='127.0.0.1', port=7373, debug=False, threaded=True)
    except KeyboardInterrupt:
        print('\n  Arrêt du serveur.')
        sys.exit(0)
