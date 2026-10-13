let candidatosDetectados = [];

const status = document.getElementById('status');
const listaContainer = document.getElementById('listaContainer');
const candidatosLista = document.getElementById('candidatosLista');
const btnLerTela = document.getElementById('btnLerTela');
const btnEnviar = document.getElementById('btnEnviarSelecionados');

// 1. Lê a tela e renderiza os checkboxes
btnLerTela.addEventListener('click', async () => {
    status.innerText = "A ler candidatos da tela...";
    candidatosLista.innerHTML = "";
    listaContainer.style.display = "none";

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url.includes("catho.com.br")) {
        status.innerText = "Erro: Abra a página de busca da Catho primeiro.";
        return;
    }

    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extrairCandidatosDaPagina
    }, (results) => {
        if (results && results[0] && results[0].result && results[0].result.length > 0) {
            candidatosDetectados = results[0].result;
            status.innerText = `${candidatosDetectados.length} candidato(s) encontrados. Selecione os que deseja:`;
            renderizarLista(candidatosDetectados);
            listaContainer.style.display = "flex";
        } else {
            status.innerText = "Nenhum candidato encontrado nesta página.";
        }
    });
});

function renderizarLista(itens) {
    candidatosLista.innerHTML = "";
    itens.forEach((c, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'candidato-item';
        itemDiv.innerHTML = `
            <input type="checkbox" id="cand_${index}" data-index="${index}">
            <label for="cand_${index}" class="candidato-info" style="cursor: pointer;">
                <span class="candidato-nome">${c.nome}</span>
                <span class="candidato-cargo">${c.cargo}</span>
            </label>
        `;
        candidatosLista.appendChild(itemDiv);
    });
}

document.getElementById('btnMarcarTodos').addEventListener('click', () => {
    document.querySelectorAll('#candidatosLista input[type="checkbox"]').forEach(cb => cb.checked = true);
});

document.getElementById('btnDesmarcarTodos').addEventListener('click', () => {
    document.querySelectorAll('#candidatosLista input[type="checkbox"]').forEach(cb => cb.checked = false);
});

// 2. Envia APENAS os candidatos marcados com checkbox
btnEnviar.addEventListener('click', async () => {
    const checkboxes = document.querySelectorAll('#candidatosLista input[type="checkbox"]:checked');
    const selecionados = Array.from(checkboxes).map(cb => {
        const idx = parseInt(cb.getAttribute('data-index'), 10);
        return candidatosDetectados[idx];
    });

    if (selecionados.length === 0) {
        status.innerText = "Selecione pelo menos 1 candidato antes de enviar.";
        return;
    }

    status.innerText = `A enviar ${selecionados.length} selecionado(s)...`;
    const API_URL = 'https://catho-extension.onrender.com/api/receber_candidatos_extensao';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contatos: selecionados })
        });

        if (response.ok) {
            status.innerText = `Sucesso! ${selecionados.length} candidato(s) enviados ao painel.`;
        } else {
            status.innerText = `Falha ao enviar (Erro ${response.status}).`;
        }
    } catch (e) {
        status.innerText = "Servidor inacessível no Render.";
    }
});

// Função injetada na aba da Catho
function extrairCandidatosDaPagina() {
    const lista = [];
    const cards = document.querySelectorAll('article, [class*="ResumeCard"], [class*="curriculo"], [class*="Card"]');

    cards.forEach(card => {
        const nomeEl = card.querySelector('h2, h3, [class*="name"], [class*="nome"]');
        const cargoEl = card.querySelector('[class*="cargo"], [class*="title"], [class*="Role"], p');
        const linkEl = card.querySelector('a[href*="curriculo"]') || card.querySelector('a');
        
        // NOVO: Captura os textos e resumos da tela
        const descricaoEl = card.querySelector('[class*="description"], [class*="experiencia"], [class*="summary"], p:not([class*="cargo"])');
        const tags = Array.from(card.querySelectorAll('[class*="tag"], [class*="skill"], [class*="badge"], li'))
                          .map(t => t.innerText.trim())
                          .filter(t => t.length > 0 && t.length < 50);

        if (nomeEl && nomeEl.innerText.trim().length > 0) {
            lista.push({
                nome: nomeEl.innerText.trim(),
                cargo: cargoEl ? cargoEl.innerText.trim() : 'Não informado',
                resumo: descricaoEl ? descricaoEl.innerText.replace(/\s+/g, ' ').trim() : 'Não especificado',
                competencias: tags.length > 0 ? tags.join(', ') : 'Não especificadas',
                link_cv: linkEl ? linkEl.href : window.location.href
            });
        }
    });

    return lista;
}
