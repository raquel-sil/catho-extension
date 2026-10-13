import hmac
import os
from flask import Flask, Response, render_template_string, request, jsonify
from dotenv import load_dotenv

load_dotenv()

APP_USER = os.getenv("APP_USER", "admin")
APP_PASSWORD = os.getenv("APP_PASSWORD", "admin")

app = Flask(__name__)

# Armazena temporariamente em memória os candidatos recebidos da extensão
candidatos_capturados = []

def _pedir_login():
    return Response(
        "Acesso restrito.", 401, {"WWW-Authenticate": 'Basic realm="Start RH - Catho Hunter"'}
    )

@app.before_request
def exigir_login():
    # Permite que a extensão envie dados via POST sem travar na autenticação
    if request.endpoint == "api_receber_candidatos_extensao" and request.method == "POST":
        return
    if not APP_USER or not APP_PASSWORD:
        return Response("Servidor sem APP_USER/APP_PASSWORD configurados.", 503)
    auth = request.authorization
    if not auth:
        return _pedir_login()
    user_ok = hmac.compare_digest(auth.username or "", APP_USER)
    pass_ok = hmac.compare_digest(auth.password or "", APP_PASSWORD)
    if not (user_ok and pass_ok):
        return _pedir_login()


HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Start RH - Painel Catho Hunter</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-900 text-gray-100 min-h-screen flex flex-col items-center p-6">
    <div class="max-w-5xl w-full bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-8 mt-6">
        
        <div class="flex items-center justify-between border-b border-gray-700 pb-6 mb-6">
            <div>
                <h1 class="text-2xl font-bold text-pink-500 flex items-center gap-2">
                    <i class="fa-solid fa-puzzle-piece"></i> Painel Catho Hunter
                </h1>
                <p class="text-sm text-gray-400 mt-1">Sincronização em tempo real de candidatos via Extensão do Navegador.</p>
            </div>
            <button onclick="carregarCandidatos()" class="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-lg transition text-xs flex items-center gap-2">
                <i class="fa-solid fa-rotate"></i> Atualizar Lista
            </button>
        </div>

        <div class="bg-gray-900/60 p-4 rounded-lg border border-gray-700 mb-6 text-xs text-gray-300">
            <p class="font-semibold text-pink-400 mb-1"><i class="fa-solid fa-info-circle"></i> Como utilizar:</p>
            <ol class="list-decimal list-inside space-y-1">
                <li>Abra o site da Catho Empresas no seu navegador logado.</li>
                <li>Faça a pesquisa de currículos que desejar.</li>
                <li>Clique no ícone da extensão <b>Start RH - Catho Hunter</b> e pressione <b>Capturar Candidatos</b>.</li>
                <li>Os perfis aparecerão automaticamente na tabela abaixo.</li>
            </ol>
        </div>

        <div id="resultadoContainer" class="mt-4">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-lg font-semibold text-gray-200 flex items-center gap-2">
                    <i class="fa-solid fa-users text-pink-500"></i> Candidatos Sincronizados:
                </h2>
                <span id="totalBadge" class="bg-pink-500/10 text-pink-400 text-xs px-3 py-1 rounded-full border border-pink-500/20 font-mono">0 Candidato(s)</span>
            </div>
            
            <div id="logList" class="space-y-3 font-sans text-sm">
                <p class="text-gray-500 text-center py-8">Nenhum candidato capturado ainda. Realize a captura pela extensão na página da Catho.</p>
            </div>
        </div>
    </div>

    <script>
        async function carregarCandidatos() {
            try {
                const response = await fetch('/api/listar_candidatos');
                const data = await response.json();
                const logList = document.getElementById('logList');
                const totalBadge = document.getElementById('totalBadge');

                if (data.status === 'success') {
                    totalBadge.innerText = `${data.contatos.length} Candidato(s)`;

                    if (data.contatos.length === 0) {
                        logList.innerHTML = `<p class="text-gray-500 text-center py-8">Nenhum candidato capturado ainda. Realize a captura pela extensão na página da Catho.</p>`;
                    } else {
                        let tableHtml = `
                            <div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse border border-gray-700">
                                    <thead>
                                        <tr class="bg-gray-900 text-pink-400 border-b border-gray-700 text-xs uppercase font-mono">
                                            <th class="p-3">Nome</th>
                                            <th class="p-3">Cargo Visível</th>
                                            <th class="p-3 text-center">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-700 bg-gray-800/50">`;

                        data.contatos.forEach(c => {
                            tableHtml += `
                                <tr class="hover:bg-gray-800 transition">
                                    <td class="p-3 font-semibold text-gray-100">${c.nome}</td>
                                    <td class="p-3 text-gray-300">${c.cargo}</td>
                                    <td class="p-3 text-center">
                                        <a href="${c.link_cv}" target="_blank" class="inline-flex items-center gap-1 bg-pink-600/20 hover:bg-pink-600/40 text-pink-400 border border-pink-500/30 px-3 py-1 rounded-md text-xs transition">
                                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Ver Perfil na Catho
                                        </a>
                                    </td>
                                </tr>`;
                        });

                        tableHtml += `</tbody></table></div>`;
                        logList.innerHTML = tableHtml;
                    }
                }
            } catch (err) {
                console.error('Erro ao atualizar lista:', err);
            }
        }

        setInterval(carregarCandidatos, 3000);
        carregarCandidatos();
    </script>
</body>
</html>
"""

@app.route("/")
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route("/api/receber_candidatos_extensao", methods=["POST"])
def api_receber_candidatos_extensao():
    global candidatos_capturados
    data = request.json or {}
    novos = data.get("contatos", [])
    
    links_existentes = {c.get("link_cv") for c in candidatos_capturados}
    for c in novos:
        if c.get("link_cv") not in links_existentes:
            candidatos_capturados.append(c)
            links_existentes.add(c.get("link_cv"))

    return jsonify({"status": "success", "total": len(candidatos_capturados)})

@app.route("/api/listar_candidatos", methods=["GET"])
def api_listar_candidatos():
    return jsonify({"status": "success", "contatos": candidatos_capturados})

if __name__ == "__main__":
    porta = int(os.getenv("PORT", "5000"))
    print("\n--- SERVIDOR LOCAL START RH (PAINEL CATHO HUNTER) INICIADO ---")
    print(f"Acesse no navegador: http://localhost:{porta}\n")
    app.run(host="127.0.0.1", port=porta, debug=False)
