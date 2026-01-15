// =============================================
// DASHBOARD.JS - Projeto Solimões | UniEja
// Auto-Atualização: 30 segundos
// =============================================

const API_URL = 'http://localhost/dashboard/api.php';

console.log('🚀 Dashboard Projeto Solimões carregado!');
console.log('📋 Sistema: UniEja EJA - Ensino Médio e Fundamental');
console.log('🔗 API:', API_URL);
console.log('⏱️ Intervalo de atualização: 30 segundos');
console.log('✅ Pronto para receber matrículas do painel admin');

// =============================================
// SISTEMA DE CHATBOT - CORRIGIDO
// =============================================

let ultimasVendasIds = new Set(); // Usar Set para melhor performance
let chatbotAberto = false;
let notificacoesNaoLidas = 0;
let primeiraVerificacao = true; // Flag para primeira execução

// Toggle do chatbot
function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    const chatbotBadge = document.getElementById('chatbotBadge');
    
    chatbotAberto = !chatbotAberto;
    
    if (chatbotAberto) {
        chatbotWindow.classList.add('show');
        // Limpar badge ao abrir
        notificacoesNaoLidas = 0;
        chatbotBadge.style.display = 'none';
        chatbotBadge.textContent = '0';
        console.log('🤖 Chatbot aberto');
    } else {
        chatbotWindow.classList.remove('show');
        console.log('🤖 Chatbot fechado');
    }
}

// Adicionar notificação no chatbot
function adicionarNotificacaoChatbot(venda) {
    const chatbotBody = document.getElementById('chatbotBody');
    const chatbotBadge = document.getElementById('chatbotBadge');
    
    // Remover mensagem de boas-vindas se existir
    const welcome = chatbotBody.querySelector('.chatbot-welcome');
    if (welcome) {
        welcome.remove();
    }
    
    // Criar mensagem
    const agora = new Date();
    const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const mensagem = document.createElement('div');
    mensagem.className = 'chatbot-message';
    mensagem.innerHTML = `
        <div class="chatbot-message-avatar">
            <i class="bi bi-check-circle-fill"></i>
        </div>
        <div class="chatbot-message-content">
            <div class="chatbot-message-header">
                <span class="chatbot-message-title">
                    <i class="bi bi-rocket-takeoff"></i>
                    Nova Matrícula UniEja!
                </span>
                <span class="chatbot-message-time">${hora}</span>
            </div>
            <div class="chatbot-message-body">
                🎓 <span class="student">${venda.cliente}</span> acabou de se matricular!<br><br>
                <strong>📚 Curso:</strong> ${venda.produto}<br>
                <strong>👤 Consultor:</strong> ${venda.vendedor}<br>
                <strong>💰 Valor:</strong> <span class="highlight">${formatarMoeda(venda.valor)}</span><br>
                <strong>📧 Email:</strong> ${venda.cliente_email || 'Não informado'}<br>
                <strong>📱 Telefone:</strong> ${venda.cliente_telefone || 'Não informado'}<br>
                <strong>✅ Status:</strong> <span style="color: #00ff88;">${venda.status || 'Aprovado'}</span>
            </div>
        </div>
    `;
    
    // Adicionar no topo
    chatbotBody.insertBefore(mensagem, chatbotBody.firstChild);
    
    // Limitar a 10 mensagens
    const mensagens = chatbotBody.querySelectorAll('.chatbot-message');
    if (mensagens.length > 10) {
        mensagens[mensagens.length - 1].remove();
    }
    
    // Atualizar badge se chatbot estiver fechado
    if (!chatbotAberto) {
        notificacoesNaoLidas++;
        chatbotBadge.textContent = notificacoesNaoLidas;
        chatbotBadge.style.display = 'flex';
        console.log('🔴 Badge atualizado:', notificacoesNaoLidas);
    }
    
    // Scroll para o topo
    chatbotBody.scrollTop = 0;
    
    // Tocar som
    tocarSomNotificacao();
    
    console.log('🤖 ✅ NOVA MATRÍCULA NOTIFICADA!');
    console.log('   👤 Aluno:', venda.cliente);
    console.log('   💰 Valor:', formatarMoeda(venda.valor));
    console.log('   📚 Curso:', venda.produto);
    console.log('   👨‍💼 Consultor:', venda.vendedor);
}

// Tocar som de notificação
function tocarSomNotificacao() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Som 1: Nota alta
        const osc1 = audioContext.createOscillator();
        const gain1 = audioContext.createGain();
        osc1.connect(gain1);
        gain1.connect(audioContext.destination);
        osc1.frequency.value = 800;
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.2, audioContext.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc1.start(audioContext.currentTime);
        osc1.stop(audioContext.currentTime + 0.2);
        
        // Som 2: Nota baixa (delay)
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 600;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.2, audioContext.currentTime + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        osc2.start(audioContext.currentTime + 0.1);
        osc2.stop(audioContext.currentTime + 0.3);
        
        console.log('🔊 Som de notificação tocado');
    } catch (error) {
        console.log('🔇 Som não disponível');
    }
}

// =============================================
// NOTIFICAÇÃO TOAST - APARECE NA TELA PARA TODOS
// =============================================

function mostrarNotificacaoToast(venda) {
    const toastContainer = document.getElementById('toastContainer');
    
    // Criar toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div class="toast-header">
            <div class="toast-icon">
                <i class="bi bi-rocket-takeoff-fill"></i>
            </div>
            <div class="toast-title-wrapper">
                <h3 class="toast-title">🎉 Nova Matrícula!</h3>
                <p class="toast-subtitle">UniEja - Acabou de acontecer</p>
            </div>
            <button class="toast-close" onclick="fecharToast(this)">
                <i class="bi bi-x"></i>
            </button>
        </div>
        <div class="toast-body">
            <div class="toast-student">
                <i class="bi bi-person-check-fill"></i>
                ${venda.cliente}
            </div>
            <div class="toast-details">
                <div class="toast-detail valor">
                    <div class="toast-detail-label">
                        <i class="bi bi-currency-dollar"></i> Valor
                    </div>
                    <div class="toast-detail-value">${formatarMoeda(venda.valor)}</div>
                </div>
                <div class="toast-detail curso">
                    <div class="toast-detail-label">
                        <i class="bi bi-book"></i> Curso
                    </div>
                    <div class="toast-detail-value">${venda.produto}</div>
                </div>
                <div class="toast-detail">
                    <div class="toast-detail-label">
                        <i class="bi bi-person-badge"></i> Consultor
                    </div>
                    <div class="toast-detail-value">${venda.vendedor}</div>
                </div>
                <div class="toast-detail">
                    <div class="toast-detail-label">
                        <i class="bi bi-clock"></i> Agora mesmo
                    </div>
                    <div class="toast-detail-value">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
            </div>
        </div>
        <div class="toast-progress"></div>
    `;
    
    // Adicionar ao container
    toastContainer.appendChild(toast);
    
    // Auto-remover após 8 segundos
    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 8000);
    
    console.log('📢 NOTIFICAÇÃO TOAST EXIBIDA NA TELA!');
}

// Fechar toast manualmente
function fecharToast(button) {
    const toast = button.closest('.toast-notification');
    toast.classList.add('removing');
    setTimeout(() => {
        toast.remove();
    }, 400);
}

// Verificar novas vendas - CORRIGIDO E MELHORADO
async function verificarNovasVendas() {
    try {
        const response = await fetch(`${API_URL}?acao=ultimas-vendas&limite=10`);
        const data = await response.json();
        
        if (data.sucesso && data.dados && data.dados.length > 0) {
            console.log('🔍 Verificando vendas... Total:', data.dados.length);
            
            // Na primeira execução, apenas salvar os IDs SEM notificar
            if (primeiraVerificacao) {
                data.dados.forEach(v => {
                    ultimasVendasIds.add(v.id);
                });
                primeiraVerificacao = false;
                console.log('✅ IDs iniciais salvos:', ultimasVendasIds.size, 'vendas');
                return;
            }
            
            // Verificar se há vendas novas (IDs que não estão no Set)
            const vendasNovas = data.dados.filter(v => !ultimasVendasIds.has(v.id));
            
            if (vendasNovas.length > 0) {
                console.log('🎉 NOVAS VENDAS DETECTADAS:', vendasNovas.length);
                
                // Processar cada venda nova
                vendasNovas.forEach(venda => {
                    console.log('📢 Processando venda ID:', venda.id);
                    
                    // Adicionar no chatbot
                    adicionarNotificacaoChatbot(venda);
                    
                    // MOSTRAR TOAST NA TELA PARA TODOS VEREM!
                    mostrarNotificacaoToast(venda);
                    
                    // Adicionar ao Set
                    ultimasVendasIds.add(venda.id);
                });
                
                // Atualizar dashboard visualmente
                mostrarIndicadorAtualizacao();
                
            } else {
                console.log('✓ Nenhuma venda nova detectada');
            }
        } else {
            console.log('📭 Nenhuma venda encontrada hoje');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar novas vendas:', error);
    }
}

// =============================================
// FORMATAR MOEDA
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

// =============================================
// CARREGAR RESUMO
// =============================================

async function carregarResumo() {
    try {
        const response = await fetch(`${API_URL}?acao=resumo`);
        const data = await response.json();
        
        if (data.sucesso) {
            const d = data.dados;
            
            // Atualizar valores
            document.getElementById('totalMes').textContent = formatarMoeda(d.total_mes);
            document.getElementById('vendasDia').textContent = formatarMoeda(d.total_dia);
            document.getElementById('quantidadeVendas').textContent = d.quantidade_mes || 0;
            document.getElementById('ticketMedio').textContent = formatarMoeda(d.ticket_medio);
            document.getElementById('metaValor').textContent = formatarMoedaSemRS(d.meta);
            document.getElementById('totalVendasComercial').textContent = formatarMoeda(d.total_mes);
            
            // Footer cards
            document.getElementById('footerTotalVendas').textContent = formatarMoeda(d.total_mes);
            document.getElementById('footerQuantidade').textContent = (d.quantidade_mes || 0) + ' Vendas';
            document.getElementById('footerTotalDinheiro').textContent = formatarMoeda(d.total_dia);
            document.getElementById('footerVendasHoje').textContent = (d.quantidade_dia || 0) + ' Vendas';
            
            // Barra de progresso
            const porcentagem = Math.min(d.porcentagem_meta || 0, 100);
            document.getElementById('barraProgresso').style.width = porcentagem + '%';
            
            console.log('✅ Resumo atualizado:', {
                total: d.total_mes,
                vendas: d.quantidade_mes,
                meta: porcentagem + '%'
            });
        }
    } catch (error) {
        console.error('❌ Erro ao carregar resumo:', error);
    }
}

// =============================================
// CARREGAR GRÁFICO
// =============================================

let graficoInstance = null;

async function carregarGrafico() {
    try {
        const response = await fetch(`${API_URL}?acao=vendas-dia`);
        const data = await response.json();
        
        const ctx = document.getElementById('graficoVendas');
        if (!ctx) return;
        
        let labels = [];
        let valores = [];
        
        if (data.sucesso && data.dados.length > 0) {
            labels = data.dados.map(v => v.dia);
            valores = data.dados.map(v => parseFloat(v.total));
            console.log('✅ Gráfico com', data.dados.length, 'dias de dados');
        } else {
            // Gráfico vazio com últimos 30 dias
            const hoje = new Date();
            for (let i = 29; i >= 0; i--) {
                const data = new Date(hoje);
                data.setDate(data.getDate() - i);
                labels.push(data.getDate() + '/' + (data.getMonth() + 1));
                valores.push(0);
            }
            console.log('📊 Gráfico vazio criado (30 dias)');
        }
        
        // Destruir gráfico anterior se existir
        if (graficoInstance) {
            graficoInstance.destroy();
        }
        
        // Criar novo gráfico
        graficoInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Vendas (R$)',
                    data: valores,
                    borderColor: '#00ffff',
                    backgroundColor: 'rgba(0, 255, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#00ffff',
                    pointBorderColor: '#000',
                    pointBorderWidth: 2
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
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#00ffff',
                        bodyColor: '#fff',
                        borderColor: '#00ffff',
                        borderWidth: 1,
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
                        ticks: {
                            color: '#999',
                            callback: function(value) {
                                return 'R$ ' + value.toLocaleString('pt-BR');
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#999',
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        }
                    }
                }
            }
        });
        
    } catch (error) {
        console.error('❌ Erro ao carregar gráfico:', error);
    }
}

// =============================================
// CARREGAR RANKINGS
// =============================================

async function carregarRankings() {
    try {
        // Ranking Dia
        const resDia = await fetch(`${API_URL}?acao=ranking-dia`);
        const dataDia = await resDia.json();
        
        if (dataDia.sucesso) {
            const listDia = document.getElementById('rankingDiaList');
            const totalDia = dataDia.dados.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);
            document.getElementById('totalRankingDia').textContent = formatarMoeda(totalDia);
            
            if (dataDia.dados.length === 0) {
                listDia.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma venda hoje</p>';
            } else {
                const maxValor = Math.max(...dataDia.dados.map(v => parseFloat(v.valor_total)));
                
                listDia.innerHTML = dataDia.dados.map(v => {
                    const porcentagem = maxValor > 0 ? (parseFloat(v.valor_total) / maxValor) * 100 : 0;
                    return `
                        <div class="ranking-item">
                            <img src="${v.foto}" alt="${v.nome}">
                            <div class="ranking-info">
                                <h5>${v.nome}</h5>
                                <p>${formatarMoeda(v.valor_total)} • ${v.total_vendas} vendas</p>
                                <div class="ranking-bar">
                                    <div class="ranking-bar-fill" style="width: ${porcentagem}%"></div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        // Ranking Geral
        const resGeral = await fetch(`${API_URL}?acao=ranking-geral`);
        const dataGeral = await resGeral.json();
        
        if (dataGeral.sucesso) {
            const listGeral = document.getElementById('rankingGeralList');
            const totalGeral = dataGeral.dados.reduce((sum, v) => sum + parseFloat(v.valor_total), 0);
            document.getElementById('totalRankingGeral').textContent = formatarMoeda(totalGeral);
            
            if (dataGeral.dados.length === 0) {
                listGeral.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Nenhuma venda este mês</p>';
            } else {
                const maxValor = Math.max(...dataGeral.dados.map(v => parseFloat(v.valor_total)));
                
                listGeral.innerHTML = dataGeral.dados.map(v => {
                    const porcentagem = maxValor > 0 ? (parseFloat(v.valor_total) / maxValor) * 100 : 0;
                    return `
                        <div class="ranking-item">
                            <img src="${v.foto}" alt="${v.nome}">
                            <div class="ranking-info">
                                <h5>${v.nome}</h5>
                                <p>${formatarMoeda(v.valor_total)} • ${v.total_vendas} vendas</p>
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
        const response = await fetch(`${API_URL}?acao=ultimas-vendas&limite=10`);
        const data = await response.json();
        
        if (data.sucesso) {
            const tbody = document.getElementById('ultimasVendasTable');
            
            if (data.dados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666; padding: 2rem;">Nenhuma venda registrada</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.dados.map(v => `
                <tr>
                    <td>${v.hora}</td>
                    <td>${v.cliente}</td>
                    <td>${v.produto}</td>
                    <td>${v.vendedor}</td>
                    <td style="color: #00ff88; font-weight: bold;">${formatarMoeda(v.valor)}</td>
                </tr>
            `).join('');
            
            console.log('✅ Últimas vendas atualizadas:', data.dados.length);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar últimas vendas:', error);
    }
}

// =============================================
// FUNÇÃO PARA MOSTRAR INDICADOR DE ATUALIZAÇÃO
// =============================================

function mostrarIndicadorAtualizacao() {
    const indicator = document.getElementById('refreshIndicator');
    if (indicator) {
        indicator.classList.add('show');
        setTimeout(() => {
            indicator.classList.remove('show');
        }, 2000);
    }
}

// =============================================
// INICIALIZAÇÃO E AUTO-REFRESH
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM pronto!');
    console.log('🚀 Projeto Solimões - Dashboard Iniciando...');
    console.log('═══════════════════════════════════════════════');
    
    // Carregar tudo imediatamente
    console.log('📊 Carregando dados iniciais...');
    carregarResumo();
    carregarGrafico();
    carregarRankings();
    carregarUltimasVendas();
    
    // Aguardar 2 segundos antes de inicializar o chatbot
    setTimeout(() => {
        console.log('🤖 Inicializando sistema de notificações...');
        verificarNovasVendas();
    }, 2000);
    
    // Auto-refresh RÁPIDO a cada 10 segundos (3x mais rápido!)
    setInterval(() => {
        const agora = new Date().toLocaleTimeString('pt-BR');
        console.log('═══════════════════════════════════════════════');
        console.log(`🔄 [${agora}] Atualizando dashboard automaticamente...`);
        
        // Mostrar indicador visual
        mostrarIndicadorAtualizacao();
        
        // Atualizar todos os dados
        carregarResumo();
        carregarGrafico();
        carregarRankings();
        carregarUltimasVendas();
        
        // IMPORTANTE: Verificar novas vendas para o chatbot
        verificarNovasVendas();
        
        console.log(`✅ [${agora}] Dashboard atualizado!`);
    }, 10000); // 10 SEGUNDOS (mais rápido!)
    
    console.log('═══════════════════════════════════════════════');
    console.log('✅ Dashboard Projeto Solimões PRONTO!');
    console.log('🔄 AUTO-REFRESH ATIVO: Atualiza a cada 10 SEGUNDOS');
    console.log('📊 Conectado com o banco de dados MySQL');
    console.log('💾 Vendas registradas no admin aparecerão automaticamente');
    console.log('🤖 Chatbot ativo: Notificações em tempo real');
    console.log('🔔 Você será notificado sobre CADA nova matrícula!');
    console.log('⏱️ Próxima atualização em 10 segundos...');
    console.log('═══════════════════════════════════════════════');
});