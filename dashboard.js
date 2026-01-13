// =============================================
// DASHBOARD.JS - AutoFlux
// Sistema que atualiza automaticamente com vendas do admin
// =============================================

const API_URL = 'api.php';
let chart = null;
let ultimoIdNotificado = 0;
let ultimoTimestampNotificado = 0;
let notificacoesPendentes = 0;
let chatbotAberto = false;
let notificacoesInicializadas = false;
let alertaConexaoAtiva = false;

const FETCH_RETRY_CONFIG = {
    retries: 2,
    backoff: 600
};

console.log('🚀 Dashboard Projeto Solimões carregado!');

// =============================================
// FORMATAÇÃO
// =============================================

function formatarMoeda(valor) {
    return 'R$ ' + parseFloat(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarMoedaSemRS(valor) {
    return parseFloat(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function sanitizeText(value) {
    return (value ?? '').toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function toDateFromApi(value) {
    if (!value) {
        return null;
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatarHorarioPorData(value) {
    const data = toDateFromApi(value);
    if (!data) {
        return null;
    }

    return data.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatarDataHoraCompleta(value) {
    const data = toDateFromApi(value);
    if (!data) {
        return '';
    }

    return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function obterHorarioNotificacao(venda) {
    return formatarHorarioPorData(venda?.data_hora) || venda?.hora || new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =============================================
// HELPER DE REDE
// =============================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeFetch(url, options = {}, retryOptions = FETCH_RETRY_CONFIG, contextLabel = url) {
    const retries = Math.max(0, retryOptions?.retries ?? 0);
    const backoff = Math.max(200, retryOptions?.backoff ?? 600);
    let tentativa = 0;

    while (true) {
        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            sinalizarRecuperacaoRede();
            return response;
        } catch (error) {
            tentativa += 1;

            if (tentativa > retries) {
                notificarFalhaRede(contextLabel, error);
                throw error;
            }

            await delay(backoff * tentativa);
        }
    }
}

// =============================================
// CHATBOT & NOTIFICAÇÕES
// =============================================

function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    if (!chatbotWindow) {
        return;
    }

    chatbotAberto = !chatbotAberto;
    chatbotWindow.classList.toggle('show', chatbotAberto);

    if (chatbotAberto) {
        notificacoesPendentes = 0;
        atualizarBadgeChatbot();
        const chatbotBody = document.getElementById('chatbotBody');
        if (chatbotBody) {
            chatbotBody.scrollTop = chatbotBody.scrollHeight;
        }
    }
}

function atualizarBadgeChatbot() {
    const badge = document.getElementById('chatbotBadge');
    if (!badge) {
        return;
    }

    if (notificacoesPendentes > 0) {
        badge.style.display = 'flex';
        badge.textContent = notificacoesPendentes;
    } else {
        badge.style.display = 'none';
        badge.textContent = '0';
    }
}

function registrarNotificacaoPendente() {
    if (chatbotAberto) {
        return;
    }
    notificacoesPendentes += 1;
    atualizarBadgeChatbot();
}

function adicionarMensagemChatbot(venda) {
    const chatbotBody = document.getElementById('chatbotBody');
    if (!chatbotBody) {
        return;
    }

    const welcome = chatbotBody.querySelector('.chatbot-welcome');
    if (welcome) {
        welcome.remove();
    }

    const container = document.createElement('div');
    container.className = 'chatbot-message';

    const horaMensagem = obterHorarioNotificacao(venda);

    container.innerHTML = `
        <div class="chatbot-message-avatar">
            <i class="bi bi-robot"></i>
        </div>
        <div class="chatbot-message-content">
            <div class="chatbot-message-header">
                <div class="chatbot-message-title">
                    <i class="bi bi-stars"></i>
                    Nova matrícula
                </div>
                <span class="chatbot-message-time">${sanitizeText(horaMensagem)}</span>
            </div>
            <div class="chatbot-message-body">
                <strong class="student">${sanitizeText(venda.cliente)}</strong> confirmou o curso
                <span class="highlight">${sanitizeText(venda.produto || 'Curso UniEja')}</span>
                com o consultor <strong>${sanitizeText(venda.vendedor)}</strong> no valor de
                <strong>${formatarMoeda(venda.valor)}</strong> (${sanitizeText(venda.plataforma || 'Pagar.me')}).
            </div>
        </div>
    `;

    chatbotBody.appendChild(container);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
    registrarNotificacaoPendente();
}

function adicionarMensagemSistema(mensagem) {
    const chatbotBody = document.getElementById('chatbotBody');
    if (!chatbotBody) {
        return;
    }

    const container = document.createElement('div');
    container.className = 'chatbot-message chatbot-system';
    const horaAtual = new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });

    container.innerHTML = `
        <div class="chatbot-message-avatar">
            <i class="bi bi-shield-exclamation"></i>
        </div>
        <div class="chatbot-message-content">
            <div class="chatbot-message-header">
                <div class="chatbot-message-title">
                    <i class="bi bi-wifi-off"></i>
                    Sistema
                </div>
                <span class="chatbot-message-time">${horaAtual}</span>
            </div>
            <div class="chatbot-message-body">${sanitizeText(mensagem)}</div>
        </div>
    `;

    chatbotBody.appendChild(container);
    chatbotBody.scrollTop = chatbotBody.scrollHeight;
}

function mostrarToastVenda(venda) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    const horaMensagem = obterHorarioNotificacao(venda);

    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-icon">
                <i class="bi bi-broadcast"></i>
            </div>
            <div class="toast-title-wrapper">
                <div class="toast-title">Nova Matrícula</div>
                <p class="toast-subtitle">Registro em tempo real</p>
            </div>
            <button class="toast-close" aria-label="Fechar notificação">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="toast-body">
            <div class="toast-student">
                <i class="bi bi-person-check"></i>
                ${sanitizeText(venda.cliente)}
            </div>
            <div class="toast-details">
                <div class="toast-detail curso">
                    <div class="toast-detail-label">
                        <i class="bi bi-journal-text"></i>
                        Curso
                    </div>
                    <div class="toast-detail-value">${sanitizeText(venda.produto || 'Curso UniEja')}</div>
                </div>
                <div class="toast-detail valor">
                    <div class="toast-detail-label">
                        <i class="bi bi-cash-coin"></i>
                        Valor
                    </div>
                    <div class="toast-detail-value">${formatarMoeda(venda.valor)}</div>
                </div>
                <div class="toast-detail">
                    <div class="toast-detail-label">
                        <i class="bi bi-person-badge"></i>
                        Consultor
                    </div>
                    <div class="toast-detail-value">${sanitizeText(venda.vendedor)}</div>
                </div>
                <div class="toast-detail">
                    <div class="toast-detail-label">
                        <i class="bi bi-alarm"></i>
                        Horário
                    </div>
                    <div class="toast-detail-value">${sanitizeText(horaMensagem)}</div>
                </div>
            </div>
        </div>
        <div class="toast-progress"></div>
    `;

    const closeButton = toast.querySelector('.toast-close');
    closeButton?.addEventListener('click', () => removerToast(toast));

    container.appendChild(toast);
    setTimeout(() => removerToast(toast), 8000);
}

function mostrarToastSistema(titulo, mensagem) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification toast-system';

    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-icon warning">
                <i class="bi bi-exclamation-triangle"></i>
            </div>
            <div class="toast-title-wrapper">
                <div class="toast-title">${sanitizeText(titulo)}</div>
                <p class="toast-subtitle">Monitoramento</p>
            </div>
            <button class="toast-close" aria-label="Fechar notificação">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="toast-body">
            ${sanitizeText(mensagem)}
        </div>
        <div class="toast-progress"></div>
    `;

    const closeButton = toast.querySelector('.toast-close');
    closeButton?.addEventListener('click', () => removerToast(toast));

    container.appendChild(toast);
    setTimeout(() => removerToast(toast), 6000);
}

function notificarFalhaRede(contexto, erro) {
    console.error(`❌ Falha ao buscar ${contexto}:`, erro);

    if (alertaConexaoAtiva) {
        return;
    }

    alertaConexaoAtiva = true;
    const mensagem = `Não consegui atualizar ${contexto}. Tentaremos novamente automaticamente.`;
    adicionarMensagemSistema(mensagem);
    mostrarToastSistema('Conexão instável', mensagem);
}

function sinalizarRecuperacaoRede() {
    if (!alertaConexaoAtiva) {
        return;
    }

    alertaConexaoAtiva = false;
    const mensagem = 'Conexão restabelecida. Atualizações em tempo real reativadas.';
    adicionarMensagemSistema(mensagem);
    mostrarToastSistema('Conexão restabelecida', mensagem);
}

function removerToast(toastElement) {
    if (!toastElement || toastElement.classList.contains('removing')) {
        return;
    }
    toastElement.classList.add('removing');
    setTimeout(() => toastElement.remove(), 400);
}

function processarNotificacoesNovas(vendas) {
    if (!Array.isArray(vendas) || vendas.length === 0) {
        return;
    }

    const ids = vendas.map(v => v.id || 0);
    const timestamps = vendas.map(v => v.timestamp || 0);
    const maiorId = Math.max(ultimoIdNotificado, ...ids);
    const maiorTimestamp = Math.max(ultimoTimestampNotificado, ...timestamps);

    if (!notificacoesInicializadas) {
        ultimoIdNotificado = maiorId;
        ultimoTimestampNotificado = maiorTimestamp;
        notificacoesInicializadas = true;
        return;
    }

    const novasVendas = vendas
        .filter(v => (v.id || 0) > ultimoIdNotificado || (v.timestamp || 0) > ultimoTimestampNotificado)
        .sort((a, b) => (a.id || 0) - (b.id || 0));

    if (novasVendas.length === 0) {
        return;
    }

    ultimoIdNotificado = Math.max(ultimoIdNotificado, maiorId);
    ultimoTimestampNotificado = Math.max(ultimoTimestampNotificado, maiorTimestamp);

    novasVendas.forEach(venda => {
        adicionarMensagemChatbot(venda);
        mostrarToastVenda(venda);
        registrarNotificacaoPendente();
    });
}

// =============================================
// CARREGAR RESUMO GERAL
// =============================================

async function carregarResumo() {
    try {
        const response = await safeFetch(
            `${API_URL}?acao=resumo`,
            {},
            FETCH_RETRY_CONFIG,
            'resumo do painel'
        );
        const data = await response.json();
        
        if (data.sucesso) {
            const d = data.dados;
            
            // Card principal
            document.getElementById('totalMes').textContent = formatarMoeda(d.total_mes);
            document.getElementById('vendasDia').textContent = formatarMoeda(d.total_dia);
            document.getElementById('quantidadeVendas').textContent = d.quantidade_mes || 0;
            document.getElementById('ticketMedio').textContent = formatarMoeda(d.ticket_medio);
            
            // Meta
            document.getElementById('metaValor').textContent = formatarMoedaSemRS(d.meta);
            const porcentagem = Math.min(d.porcentagem_meta, 100).toFixed(0);
            document.getElementById('barraProgresso').style.width = porcentagem + '%';
            
            // Dashboard comercial
            document.getElementById('totalVendasComercial').textContent = formatarMoeda(d.total_mes);
            
            // Footer cards
            document.getElementById('footerTotalVendas').textContent = formatarMoeda(d.total_mes);
            document.getElementById('footerQuantidade').textContent = d.quantidade_mes + ' Vendas';
            document.getElementById('footerTotalDinheiro').textContent = formatarMoeda(d.total_dia);
            document.getElementById('footerVendasHoje').textContent = d.quantidade_dia + ' Vendas';
            
            console.log('✅ Resumo atualizado');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar resumo:', error);
    }
}

// =============================================
// CARREGAR GRÁFICO
// =============================================

async function carregarGrafico() {
    try {
        const response = await safeFetch(
            `${API_URL}?acao=vendas-dia`,
            {},
            FETCH_RETRY_CONFIG,
            'gráfico de vendas'
        );
        const data = await response.json();
        
        const ctx = document.getElementById('graficoVendas').getContext('2d');
        
        if (chart) {
            chart.destroy();
        }
        
        let dias = [];
        let valores = [];
        
        if (data.sucesso && data.dados.length > 0) {
            // Se tem dados, usar os dados reais
            dias = data.dados.map(v => v.dia);
            valores = data.dados.map(v => parseFloat(v.total));
        } else {
            // Se não tem dados, mostrar gráfico vazio dos últimos 30 dias
            const hoje = new Date();
            for (let i = 29; i >= 0; i--) {
                const data = new Date(hoje);
                data.setDate(hoje.getDate() - i);
                dias.push(data.getDate() + '/' + (data.getMonth() + 1));
                valores.push(0);
            }
        }
        
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: valores,
                    borderColor: '#00ffff',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#00ffff',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#00ff88',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#00ffff',
                        bodyColor: '#fff',
                        borderColor: '#00ffff',
                        borderWidth: 2,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                return 'Dia ' + context[0].label;
                            },
                            label: function(context) {
                                return 'Total: ' + formatarMoeda(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 255, 255, 0.1)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 10
                            },
                            callback: function(value) {
                                return formatarMoedaSemRS(value);
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#666',
                            font: {
                                size: 10
                            },
                            maxRotation: 45,
                            minRotation: 45
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
        
        console.log('✅ Gráfico atualizado com', valores.length, 'dias');
    } catch (error) {
        console.error('❌ Erro ao carregar gráfico:', error);
        // Criar gráfico vazio em caso de erro
        const ctx = document.getElementById('graficoVendas').getContext('2d');
        if (chart) chart.destroy();
        
        const hoje = new Date();
        const dias = [];
        const valores = [];
        for (let i = 29; i >= 0; i--) {
            const data = new Date(hoje);
            data.setDate(hoje.getDate() - i);
            dias.push(data.getDate() + '/' + (data.getMonth() + 1));
            valores.push(0);
        }
        
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dias,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: valores,
                    borderColor: '#00ffff',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 255, 255, 0.1)' }, ticks: { color: '#666' } },
                    x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#666' } }
                }
            }
        });
    }
}

// =============================================
// CARREGAR RANKINGS
// =============================================

async function carregarRankings() {
    try {
        // Ranking Diário
        const resDia = await safeFetch(
            `${API_URL}?acao=ranking-dia`,
            {},
            FETCH_RETRY_CONFIG,
            'ranking diário'
        );
        const dataDia = await resDia.json();
        
        if (dataDia.sucesso) {
            const totalDia = dataDia.dados.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);
            document.getElementById('totalRankingDia').textContent = formatarMoeda(totalDia);
            
            const listDia = document.getElementById('rankingDiaList');
            
            if (dataDia.dados.length === 0) {
                listDia.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma venda hoje</p>';
            } else {
                listDia.innerHTML = dataDia.dados.map((v, index) => {
                    const porcentagem = totalDia > 0 ? (parseFloat(v.valor_total) / totalDia * 100).toFixed(0) : 0;
                    return `
                        <div class="ranking-item">
                            <img src="${v.foto}" alt="${v.nome}">
                            <div class="ranking-info">
                                <h5>${v.nome}</h5>
                                <p>R$ ${parseFloat(v.valor_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})} • ${v.total_vendas} ${v.total_vendas === 1 ? 'Venda' : 'Vendas'}</p>
                                <div class="ranking-bar">
                                    <div class="ranking-bar-fill" style="width: ${porcentagem}%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        // Ranking Geral (Mês)
        const resGeral = await safeFetch(
            `${API_URL}?acao=ranking-geral`,
            {},
            FETCH_RETRY_CONFIG,
            'ranking mensal'
        );
        const dataGeral = await resGeral.json();
        
        if (dataGeral.sucesso) {
            const totalGeral = dataGeral.dados.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);
            document.getElementById('totalRankingGeral').textContent = formatarMoeda(totalGeral);
            
            const listGeral = document.getElementById('rankingGeralList');
            
            if (dataGeral.dados.length === 0) {
                listGeral.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma venda este mês</p>';
            } else {
                listGeral.innerHTML = dataGeral.dados.map((v, index) => {
                    const porcentagem = totalGeral > 0 ? (parseFloat(v.valor_total) / totalGeral * 100).toFixed(0) : 0;
                    return `
                        <div class="ranking-item">
                            <img src="${v.foto}" alt="${v.nome}">
                            <div class="ranking-info">
                                <h5>${v.nome}</h5>
                                <p>R$ ${parseFloat(v.valor_total).toLocaleString('pt-BR', {minimumFractionDigits: 2})} • ${v.total_vendas} ${v.total_vendas === 1 ? 'Venda' : 'Vendas'}</p>
                                <div class="ranking-bar">
                                    <div class="ranking-bar-fill" style="width: ${porcentagem}%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        console.log('✅ Rankings atualizados');
    } catch (error) {
        console.error('❌ Erro ao carregar rankings:', error);
    }
}

// =============================================
// CARREGAR ÚLTIMAS VENDAS
// =============================================

async function carregarUltimasVendas() {
    try {
        const response = await safeFetch(
            `${API_URL}?acao=ultimas-vendas&limite=10&intervalo_horas=24`,
            {},
            FETCH_RETRY_CONFIG,
            'últimas vendas'
        );
        const data = await response.json();
        
        if (data.sucesso) {
            const tbody = document.getElementById('ultimasVendasTable');
            
            if (data.dados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666; padding: 2rem;">Nenhuma venda registrada</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.dados.map(v => {
                const horaDetalhada = formatarDataHoraCompleta(v.data_hora) || 'Horário indisponível';
                return `
                    <tr>
                        <td title="${sanitizeText(horaDetalhada)}">${sanitizeText(v.hora || '--:--')}</td>
                        <td>${sanitizeText(v.cliente)}</td>
                        <td>${sanitizeText(v.produto || '-')}</td>
                        <td>${sanitizeText(v.vendedor)}</td>
                        <td style="color: #00ff88; font-weight: bold;">${formatarMoeda(v.valor)}</td>
                    </tr>
                `;
            }).join('');

            processarNotificacoesNovas(data.dados);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar últimas vendas:', error);
    }
}

// =============================================
// INICIALIZAÇÃO E AUTO-REFRESH
// =============================================

// Função para mostrar/esconder indicador de atualização
function mostrarIndicadorAtualizacao() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000); // Mostra por 2 segundos
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM pronto!');
    console.log('🚀 Projeto Solimões - Dashboard Iniciando...');
    
    // Carregar tudo imediatamente
    console.log('📊 Carregando dados iniciais...');
    carregarResumo();
    carregarGrafico();
    carregarRankings();
    carregarUltimasVendas();
    
    // Auto-refresh a cada 30 segundos
    setInterval(() => {
        const agora = new Date().toLocaleTimeString('pt-BR');
        console.log(`🔄 [${agora}] Atualizando dashboard automaticamente...`);
        
        // Mostrar indicador visual
        mostrarIndicadorAtualizacao();
        
        // Atualizar todos os dados
        carregarResumo();
        carregarGrafico();
        carregarRankings();
        carregarUltimasVendas();
        
        console.log(`✅ [${agora}] Dashboard atualizado!`);
    }, 30000); // 30 segundos
    
    console.log('✅ Dashboard Projeto Solimões PRONTO!');
    console.log('🔄 AUTO-REFRESH ATIVO: Atualiza a cada 30 segundos');
    console.log('📊 Conectado com o banco de dados MySQL');
    console.log('💾 Vendas registradas no admin aparecerão aqui automaticamente');
    console.log('⏱️ Próxima atualização em 30 segundos...');
});

// Log inicial
console.log('🚀 Dashboard Projeto Solimões carregado!');
console.log('📋 Sistema: UniEja EJA - Ensino Médio e Fundamental');
console.log('🔗 API:', API_URL);
console.log('⏱️ Intervalo de atualização: 30 segundos');
console.log('✅ Pronto para receber matrículas do painel admin');