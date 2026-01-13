// ========================================
// JAVASCRIPT COM INTEGRAÇÃO DE API REAL
// ========================================

// ========================================
// CONFIGURAÇÕES
// ========================================

// URL da sua API (MUDE AQUI PARA SEU DOMÍNIO)
const API_URL = new URL('./api.php', window.location.href).href; // Resolve para o mesmo domínio da página

// Configurações
const CONFIG = {
    atualizarAutomatico: true,      // Atualizar dados automaticamente?
    intervaloAtualizacao: 30000,    // Intervalo de atualização (30 segundos)
    diasGrafico: 15,                // Quantos dias mostrar no gráfico
    limiteVendas: 10                // Quantas vendas mostrar na tabela
};

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================

let chartVendas = null;
let intervaloAtualizacao = null;

// ========================================
// INICIALIZAÇÃO
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('%c🚀 Dashboard Iniciado!', 'color: #00f7ff; font-size: 20px; font-weight: bold;');
    console.log('%cConectando com a API...', 'color: #94a3b8; font-size: 12px;');
    
    // Carregar dados iniciais
    carregarDashboard();
    
    // Configurar atualização automática
    if (CONFIG.atualizarAutomatico) {
        intervaloAtualizacao = setInterval(() => {
            console.log('🔄 Atualizando dados...');
            carregarDashboard();
        }, CONFIG.intervaloAtualizacao);
    }
});

// ========================================
// CARREGAR TODO O DASHBOARD
// ========================================

async function carregarDashboard() {
    try {
        // Mostrar indicador de carregamento
        console.log('📊 Carregando dados do dashboard...');
        
        // Carregar todos os dados em paralelo
        const [resumo, vendasDia, rankingGeral, rankingDia, ultimasVendas] = await Promise.all([
            buscarResumo(),
            buscarVendasPorDia(),
            buscarRankingGeral(),
            buscarRankingDia(),
            buscarUltimasVendas()
        ]);
        
        // Atualizar interface
        if (resumo) atualizarResumo(resumo);
        if (vendasDia) criarGraficoVendas(vendasDia);
        if (rankingGeral) renderizarRankingGeral(rankingGeral);
        if (rankingDia) renderizarRankingDia(rankingDia);
        if (ultimasVendas) renderizarTabelaVendas(ultimasVendas);
        
        console.log('✅ Dashboard carregado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dashboard:', error);
        mostrarErro('Erro ao carregar os dados. Verifique sua conexão.');
    }
}

// ========================================
// 1. BUSCAR RESUMO (KPIs)
// ========================================

async function buscarResumo() {
    try {
        const response = await fetch(`${API_URL}?acao=resumo`);
        const data = await response.json();
        
        if (data.sucesso) {
            return data.dados;
        } else {
            throw new Error(data.mensagem || 'Erro ao buscar resumo');
        }
    } catch (error) {
        console.error('Erro ao buscar resumo:', error);
        return null;
    }
}

function atualizarResumo(dados) {
    // Animar total do mês
    animarNumero('totalVendas', dados.totalMes, true);
    
    // Atualizar quantidade de vendas
    animarNumero('quantidade_vendas', dados.quantidadeMes, false);
    
    // Atualizar ticket médio
    setTimeout(() => {
        document.getElementById('ticket_medio').textContent = formatarMoeda(dados.ticketMedio);
    }, 1000);
    
    // Atualizar vendas do dia
    const totalDiaFormatado = formatarMoeda(dados.totalDia);
    document.getElementById('totalVendas_hoje').textContent = totalDiaFormatado;
    document.getElementById('totalVendas_desktop').textContent = totalDiaFormatado;
    
    // Atualizar barra de progresso da meta
    const barra = document.getElementById('barraProgresso');
    const porcentagem = Math.min(Math.round(dados.progressoMeta), 100);
    
    if (barra) {
        setTimeout(() => {
            barra.style.width = porcentagem + '%';
            const span = barra.querySelector('span');
            if (span) {
                span.textContent = porcentagem + '%';
            }
        }, 500);
    }
}

// ========================================
// 2. BUSCAR VENDAS POR DIA (GRÁFICO)
// ========================================

async function buscarVendasPorDia() {
    try {
        const response = await fetch(`${API_URL}?acao=vendas-dia&dias=${CONFIG.diasGrafico}`);
        const data = await response.json();
        
        if (data.sucesso) {
            return data.dados;
        } else {
            throw new Error(data.mensagem || 'Erro ao buscar vendas por dia');
        }
    } catch (error) {
        console.error('Erro ao buscar vendas por dia:', error);
        return null;
    }
}

function criarGraficoVendas(vendas) {
    const ctx = document.getElementById('graficoVendasPorDia');
    if (!ctx) return;
    
    // Destruir gráfico anterior se existir
    if (chartVendas) {
        chartVendas.destroy();
    }
    
    // Criar gradiente
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 247, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 247, 255, 0)');
    
    // Criar gráfico
    chartVendas = new Chart(ctx, {
        type: 'line',
        data: {
            labels: vendas.map(v => v.dia),
            datasets: [{
                label: 'Vendas (R$)',
                data: vendas.map(v => v.valor),
                backgroundColor: gradient,
                borderColor: '#00f7ff',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#00f7ff',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                pointHoverBackgroundColor: '#00ff88',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#00f7ff',
                    bodyColor: '#fff',
                    borderColor: '#00f7ff',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'R$ ' + context.parsed.y.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                            });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        callback: function(value) {
                            return 'R$ ' + (value / 1000).toFixed(1) + 'k';
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#94a3b8'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

// ========================================
// 3. BUSCAR RANKING GERAL
// ========================================

async function buscarRankingGeral() {
    try {
        const response = await fetch(`${API_URL}?acao=ranking-geral`);
        const data = await response.json();
        
        if (data.sucesso) {
            return data.dados;
        } else {
            throw new Error(data.mensagem || 'Erro ao buscar ranking geral');
        }
    } catch (error) {
        console.error('Erro ao buscar ranking geral:', error);
        return null;
    }
}

function renderizarRankingGeral(dados) {
    const container = document.getElementById('ranking-container');
    if (!container) return;
    
    // Atualizar total do ranking
    const totalElement = document.getElementById('total_vendas_ranking');
    if (totalElement) {
        totalElement.textContent = formatarMoeda(dados.totalRanking);
    }
    
    // Limpar container
    container.innerHTML = '';
    
    if (dados.vendedores.length === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 1rem;">Nenhuma venda este mês</p>';
        return;
    }
    
    const maxValor = dados.vendedores[0].valor;
    
    dados.vendedores.forEach((vendedor, index) => {
        const percentual = maxValor > 0 ? (vendedor.valor / maxValor) * 100 : 0;
        const ticketMedio = vendedor.vendas > 0 ? vendedor.valor / vendedor.vendas : 0;
        
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.style.animationDelay = `${index * 0.1}s`;
        
        // Ícones de medalha
        let iconHtml = '';
        if (index === 0) {
            iconHtml = '<i class="bi bi-trophy-fill rank-icon" style="color: #FFD700;"></i>';
        } else if (index === 1) {
            iconHtml = '<i class="bi bi-trophy rank-icon" style="color: #C0C0C0;"></i>';
        } else if (index === 2) {
            iconHtml = '<i class="bi bi-award rank-icon" style="color: #CD7F32;"></i>';
        }
        
        item.innerHTML = `
            <img src="${vendedor.foto}" 
                 alt="${vendedor.nome}" 
                 class="ranking-photo" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(vendedor.nome)}&background=00f7ff&color=fff'">
            ${iconHtml}
            <div class="ranking-info">
                <div class="ranking-name">${vendedor.nome}</div>
                <div class="vendor-stats">
                    ${vendedor.vendas} vendas • TM: ${formatarMoeda(ticketMedio)}
                </div>
                <div class="progress mt-2">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         style="width: ${percentual}%"
                         title="${formatarMoeda(vendedor.valor)}">
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// ========================================
// 4. BUSCAR RANKING DO DIA
// ========================================

async function buscarRankingDia() {
    try {
        const response = await fetch(`${API_URL}?acao=ranking-dia`);
        const data = await response.json();
        
        if (data.sucesso) {
            return data.dados;
        } else {
            throw new Error(data.mensagem || 'Erro ao buscar ranking do dia');
        }
    } catch (error) {
        console.error('Erro ao buscar ranking do dia:', error);
        return null;
    }
}

function renderizarRankingDia(dados) {
    const container = document.getElementById('ranking-container_dia');
    if (!container) return;
    
    // Atualizar total do ranking
    const totalElement = document.getElementById('total_vendas_dia_ranking');
    if (totalElement) {
        totalElement.textContent = formatarMoeda(dados.totalRanking);
    }
    
    // Limpar container
    container.innerHTML = '';
    
    if (dados.vendedores.length === 0 || dados.totalRanking === 0) {
        container.innerHTML = '<p class="text-center" style="color: var(--text-secondary); padding: 1rem;">Nenhuma venda hoje</p>';
        return;
    }
    
    const maxValor = dados.vendedores[0].valor;
    
    dados.vendedores.forEach((vendedor, index) => {
        // Pular vendedores sem vendas
        if (vendedor.valor === 0) return;
        
        const percentual = maxValor > 0 ? (vendedor.valor / maxValor) * 100 : 0;
        const ticketMedio = vendedor.vendas > 0 ? vendedor.valor / vendedor.vendas : 0;
        
        const item = document.createElement('div');
        item.className = 'ranking-item';
        item.style.animationDelay = `${index * 0.1}s`;
        
        // Ícones de medalha
        let iconHtml = '';
        if (index === 0) {
            iconHtml = '<i class="bi bi-trophy-fill rank-icon" style="color: #FFD700;"></i>';
        } else if (index === 1) {
            iconHtml = '<i class="bi bi-trophy rank-icon" style="color: #C0C0C0;"></i>';
        } else if (index === 2) {
            iconHtml = '<i class="bi bi-award rank-icon" style="color: #CD7F32;"></i>';
        }
        
        item.innerHTML = `
            <img src="${vendedor.foto}" 
                 alt="${vendedor.nome}" 
                 class="ranking-photo" 
                 onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(vendedor.nome)}&background=00ff88&color=fff'">
            ${iconHtml}
            <div class="ranking-info">
                <div class="ranking-name">${vendedor.nome}</div>
                <div class="vendor-stats">
                    ${vendedor.vendas} vendas • TM: ${formatarMoeda(ticketMedio)}
                </div>
                <div class="progress mt-2">
                    <div class="progress-bar progress-bar-striped progress-bar-animated" 
                         style="width: ${percentual}%; background: linear-gradient(90deg, #00ff88, #00f7ff);"
                         title="${formatarMoeda(vendedor.valor)}">
                    </div>
                </div>
            </div>
        `;
        
        container.appendChild(item);
    });
}

// ========================================
// 5. BUSCAR ÚLTIMAS VENDAS
// ========================================

async function buscarUltimasVendas() {
    try {
        const response = await fetch(`${API_URL}?acao=ultimas-vendas&limite=${CONFIG.limiteVendas}`);
        const data = await response.json();
        
        if (data.sucesso) {
            return data.dados;
        } else {
            throw new Error(data.mensagem || 'Erro ao buscar últimas vendas');
        }
    } catch (error) {
        console.error('Erro ao buscar últimas vendas:', error);
        return null;
    }
}

function renderizarTabelaVendas(vendas) {
    const tbody = document.getElementById('tabelaUltimasVendas');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (vendas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: var(--text-secondary);">Nenhuma venda registrada</td></tr>';
        return;
    }
    
    vendas.forEach((venda, index) => {
        const tr = document.createElement('tr');
        tr.style.animation = `fadeInUp 0.5s ease ${index * 0.05}s both`;
        
        tr.innerHTML = `
            <td>${venda.hora}</td>
            <td>${venda.cliente}</td>
            <td>${venda.produto}</td>
            <td>${venda.vendedor}</td>
            <td><strong style="color: var(--neon-green);">${formatarMoeda(venda.valor)}</strong></td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ========================================
// 6. REGISTRAR NOVA VENDA (EXEMPLO)
// ========================================

async function registrarNovaVenda(dadosVenda) {
    try {
        const response = await fetch(`${API_URL}?acao=nova-venda`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosVenda)
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            console.log('✅ Venda registrada:', data.dados);
            mostrarSucesso('Venda registrada com sucesso!');
            
            // Recarregar dashboard
            carregarDashboard();
            
            return data.dados;
        } else {
            throw new Error(data.mensagem);
        }
    } catch (error) {
        console.error('❌ Erro ao registrar venda:', error);
        mostrarErro('Erro ao registrar venda: ' + error.message);
        throw error;
    }
}

// Exemplo de uso:
// registrarNovaVenda({
//     cliente: 'João Silva',
//     produto_id: 1,
//     vendedor_id: 1,
//     valor: 1297.00
// });

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function animarNumero(elementoId, valorFinal, isMoeda = false) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;
    
    const valorNumerico = parseFloat(valorFinal);
    const duracao = 2000;
    const incremento = valorNumerico / (duracao / 16);
    let valorAtual = 0;
    
    const timer = setInterval(() => {
        valorAtual += incremento;
        
        if (valorAtual >= valorNumerico) {
            valorAtual = valorNumerico;
            clearInterval(timer);
        }
        
        if (isMoeda) {
            elemento.textContent = formatarMoeda(valorAtual);
        } else {
            elemento.textContent = Math.round(valorAtual);
        }
    }, 16);
}

function mostrarSucesso(mensagem) {
    console.log('✅', mensagem);
    // Você pode adicionar uma biblioteca de toasts aqui
    // Exemplo: toastr.success(mensagem);
}

function mostrarErro(mensagem) {
    console.error('❌', mensagem);
    // Você pode adicionar uma biblioteca de toasts aqui
    // Exemplo: toastr.error(mensagem);
}

// ========================================
// LIMPAR INTERVALO AO SAIR
// ========================================

window.addEventListener('beforeunload', function() {
    if (intervaloAtualizacao) {
        clearInterval(intervaloAtualizacao);
    }
});

// ========================================
// LOG DE INICIALIZAÇÃO
// ========================================

console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00f7ff;');
console.log('%c      DASHBOARD DE VENDAS v1.0      ', 'color: #00f7ff; font-weight: bold;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00f7ff;');
console.log('%cAPI URL: ' + API_URL, 'color: #94a3b8;');
console.log('%cAtualização automática: ' + (CONFIG.atualizarAutomatico ? 'Sim' : 'Não'), 'color: #94a3b8;');
console.log('%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'color: #00f7ff;');