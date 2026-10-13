document.getElementById('btnExtrair').addEventListener('click', async () => {
    const status = document.getElementById('status');
    const resultado = document.getElementById('resultado');
    
    status.innerText = "A extrair candidatos da tela...";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.includes("catho.com.br")) {
        status.innerText = "Erro: Navegue até a página da Catho antes de capturar.";
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extrairCandidatosDaPagina
    }, async (results) => {
        if (results && results[0] && results[0].result && results[0].result.length > 0) {
            const candidatos = results[0].result;
            resultado.value = JSON.stringify(candidatos, null, 2);
            status.innerText = `Sucesso! ${candidatos.length} candidato(s) capturado(s).`;
            
            // URL configurada para o seu servidor no Render
            const API_URL = 'https://catho-extension.onrender.com/api/receber_candidatos_extensao';

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contatos: candidatos })
                });

                if (response.ok) {
                    status.innerText += " (Enviados ao painel!)";
                } else {
                    status.innerText += " (Falha ao enviar ao painel - Erro " + response.status + ")";
                }
            } catch (e) {
                console.log("Servidor não está ativo ou inacessível.", e);
                status.innerText += " (Servidor inacessível)";
            }
        } else {
            status.innerText = "Nenhum candidato encontrado nesta página.";
        }
    });
});

function extrairCandidatosDaPagina() {
    const lista = [];
    const cards = document.querySelectorAll('article, [class*="ResumeCard"], [class*="curriculo"], [class*="Card"]');

    cards.forEach(card => {
        const nomeEl = card.querySelector('h2, h3, [class*="name"], [class*="nome"]');
        const cargoEl = card.querySelector('[class*="cargo"], [class*="title"], [class*="Role"], p');
        const linkEl = card.querySelector('a[href*="curriculo"]') || card.querySelector('a');

        if (nomeEl && nomeEl.innerText.trim().length > 0) {
            lista.push({
                nome: nomeEl.innerText.trim(),
                cargo: cargoEl ? cargoEl.innerText.trim() : 'Não informado',
                link_cv: linkEl ? linkEl.href : window.location.href
            });
        }
    });

    return lista;
}
