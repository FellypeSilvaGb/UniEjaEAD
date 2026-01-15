// =============================================
// ADMIN.JS - UniEja | UniEja
// Sistema Completo e Funcional
// =============================================

const STORAGE_KEY = 'usuarioLogado';
const usuarioLogado = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY);

if (!usuarioLogado) {
    window.location.href = 'login.html';
}

const API_URL = 'api.php';

let assistantToggle = null;
let assistantClose = null;
let assistantPanel = null;
let assistantMessages = null;
let assistantActions = null;
let assistantForm = null;
let assistantInput = null;

const assistantState = {
    open: false,
    resumo: null,
    isResponding: false
};

function cacheAssistantElements() {
    assistantToggle = document.getElementById('assistantToggle');
    assistantClose = document.getElementById('assistantClose');
    assistantPanel = document.getElementById('assistantPanel');
    assistantMessages = document.getElementById('assistantMessages');
    assistantActions = document.getElementById('assistantActions');
    assistantForm = document.getElementById('assistantForm');
    assistantInput = document.getElementById('assistantInput');
}

function toggleAssistant(forceState) {
    if (!assistantPanel) {
        return;
    }
    const nextState = typeof forceState === 'boolean' ? forceState : !assistantState.open;
    assistantState.open = nextState;
    assistantPanel.classList.toggle('open', nextState);
}

function getAssistantTimestamp() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function appendAssistantMessage(text, sender = 'bot') {
    if (!assistantMessages) {
        return;
    }
    const container = document.createElement('div');
    container.className = `assistant-message ${sender}`;
    const content = document.createElement('p');
    content.textContent = text;
    const time = document.createElement('span');
    time.textContent = getAssistantTimestamp();
    container.appendChild(content);
    container.appendChild(time);
    assistantMessages.appendChild(container);
    assistantMessages.scrollTop = assistantMessages.scrollHeight;
}

async function fetchResumoSnapshot() {
    if (assistantState.resumo) {
        return assistantState.resumo;
    }
    try {
        const response = await fetch(`${API_URL}?acao=resumo`);
        const payload = await response.json();
        if (response.ok && payload.sucesso) {
            assistantState.resumo = payload.dados;
            return payload.dados;
        }
    } catch (error) {
        console.error('Erro ao buscar resumo para o mentor:', error);
    }
    return null;
}

async function buildAssistantAnswer(question) {
    const normalized = (question || '').toLowerCase();

    if (normalized.includes('matr') || normalized.includes('venda')) {
        const resumo = await fetchResumoSnapshot();
        if (resumo) {
            return `Hoje registramos ${resumo.quantidade_dia} matrículas (${formatarMoeda(resumo.total_dia)}). No mês já são ${resumo.quantidade_mes} matrículas somando ${formatarMoeda(resumo.total_mes)}.`;
        }
        return 'Ainda não consegui acessar o painel agora, mas posso avisar um mentor para atualizar você em instantes.';
    }

    if (normalized.includes('bolsa') || normalized.includes('desconto')) {
        return 'Mantemos bolsas aos consultores em turnos específicos. Informe o time que veio do painel e valide as condições ativas hoje.';
    }

    if (normalized.includes('meta') || normalized.includes('objetivo')) {
        const resumo = await fetchResumoSnapshot();
        if (resumo) {
            return `A meta mensal está em ${formatarMoeda(resumo.total_mes)} até agora. Registre novas matrículas em "Nova Venda" para se aproximar do objetivo.`;
        }
        return 'Assim que conseguir conectar no painel trago o quanto falta para a meta mensal.';
    }

    return 'Anotei seu pedido. Use as ações rápidas ou registre uma venda para manter o painel atualizado.';
}

async function handleAssistantQuestion(question) {
    if (!question || !question.trim()) {
        return;
    }
    appendAssistantMessage(question.trim(), 'user');
    assistantState.isResponding = true;
    const reply = await buildAssistantAnswer(question);
    appendAssistantMessage(reply, 'bot');
    assistantState.isResponding = false;
}

function initAssistant() {
    cacheAssistantElements();
    if (!assistantPanel || !assistantToggle) {
        return;
    }

    assistantToggle.addEventListener('click', () => toggleAssistant());
    assistantClose?.addEventListener('click', () => toggleAssistant(false));

    assistantActions?.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-question]');
        if (!button) return;
        handleAssistantQuestion(button.dataset.question);
    });

    assistantForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (assistantState.isResponding) {
            return;
        }
        const value = assistantInput ? assistantInput.value.trim() : '';
        if (assistantInput) {
            assistantInput.value = '';
        }
        handleAssistantQuestion(value);
    });
}

console.log('🚀 Admin UniEja carregado!');

// =============================================
// NAVEGAÇÃO - CORRIGIDA
// =============================================

function mudarAba(aba) {
    // Remove active de todas as tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active de todas as sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Adiciona active na tab clicada
    const tabClicada = event ? event.currentTarget : document.querySelector(`[onclick*="${aba}"]`);
    if (tabClicada) tabClicada.classList.add('active');
    
    // Adiciona active na section correspondente
    const section = document.getElementById('section-' + aba);
    if (section) section.classList.add('active');
    
    // Carregar dados conforme a aba
    if (aba === 'listar') carregarVendas();
    if (aba === 'clientes') carregarClientes();
    if (aba === 'produtos') carregarProdutos();
    if (aba === 'vendedores') carregarVendedores();
    if (aba === 'meta') carregarMeta();
    
    console.log('✅ Aba alterada para:', aba);
}

// =============================================
// FORMATAR
// =============================================

function formatarMoeda(valor) {
    return 'R$ ' + parseFloat(valor || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarData(data) {
    if (!data) return '-';
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

// =============================================
// CARREGAR ESTATÍSTICAS
// =============================================

async function carregarEstatisticas() {
    try {
        const response = await fetch(`${API_URL}?acao=resumo`);
        const data = await response.json();
        
        if (data.sucesso) {
            const d = data.dados;
            document.getElementById('totalMes').textContent = formatarMoeda(d.total_mes);
            document.getElementById('vendasMes').textContent = d.quantidade_mes || 0;
            
            // Buscar total de clientes
            const resClientes = await fetch(`${API_URL}?acao=listar-clientes`);
            const dataClientes = await resClientes.json();
            if (dataClientes.sucesso) {
                document.getElementById('totalClientes').textContent = dataClientes.dados.length;
            }
            
            console.log('✅ Estatísticas atualizadas');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
    }
}

// =============================================
// CARREGAR SELECTS
// =============================================

async function carregarSelects() {
    try {
        // Produtos
        const resProdutos = await fetch(`${API_URL}?acao=listar-produtos`);
        const dataProdutos = await resProdutos.json();
        
        if (dataProdutos.sucesso) {
            const select = document.getElementById('produto');
            select.innerHTML = '<option value="">Selecione o curso</option>';
            dataProdutos.dados.forEach(p => {
                select.innerHTML += `<option value="${p.id}" data-preco="${p.preco}">${p.nome} - R$ ${parseFloat(p.preco).toFixed(2)}</option>`;
            });
        }
        
        // Vendedores
        const resVendedores = await fetch(`${API_URL}?acao=listar-vendedores`);
        const dataVendedores = await resVendedores.json();
        
        if (dataVendedores.sucesso) {
            const select = document.getElementById('vendedor');
            select.innerHTML = '<option value="">Selecione o consultor</option>';
            dataVendedores.dados.forEach(v => {
                select.innerHTML += `<option value="${v.id}">${v.nome}</option>`;
            });
        }
        
        // Auto-preencher valor ao selecionar produto
        document.getElementById('produto').addEventListener('change', function() {
            const option = this.options[this.selectedIndex];
            const preco = option.getAttribute('data-preco');
            if (preco) {
                document.getElementById('valor').value = preco;
            }
        });
        
        console.log('✅ Selects carregados');
    } catch (error) {
        console.error('❌ Erro ao carregar selects:', error);
    }
}

// =============================================
// REGISTRAR VENDA
// =============================================

async function registrarVenda(e) {
    e.preventDefault();
    
    const cliente = document.getElementById('cliente').value.trim();
    const email = document.getElementById('email').value.trim();
    const telefone = document.getElementById('telefone').value.trim();
    const produto_id = document.getElementById('produto').value;
    const vendedor_id = document.getElementById('vendedor').value;
    const valor = document.getElementById('valor').value;
    const dataHora = document.getElementById('dataHora').value;
    const status = document.getElementById('status').value;
    
    // Validações
    if (!cliente) {
        alert('❌ Nome do aluno é obrigatório!');
        return;
    }
    
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        alert('❌ Email inválido!');
        return;
    }
    
    const telefoneDigitos = telefone.replace(/\D/g, '');
    if (telefoneDigitos.length < 10) {
        alert('❌ Telefone inválido! Mínimo 10 dígitos.');
        return;
    }
    
    if (!produto_id) {
        alert('❌ Selecione um curso!');
        return;
    }
    
    if (!vendedor_id) {
        alert('❌ Selecione um consultor!');
        return;
    }
    
    if (!valor || parseFloat(valor) <= 0) {
        alert('❌ Valor inválido!');
        return;
    }
    
    const btn = document.querySelector('#formVenda button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Registrando...';
    
    try {
        const response = await fetch(`${API_URL}?acao=nova-venda`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cliente,
                cliente_email: email,
                cliente_telefone: telefone,
                produto_id,
                vendedor_id,
                valor,
                data_hora: dataHora,
                status
            })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            alert('✅ Matrícula UniEja registrada com sucesso!\n\nAluno: ' + cliente + '\nValor: R$ ' + parseFloat(valor).toFixed(2));
            limparForm();
            carregarEstatisticas();
        } else {
            alert('❌ Erro: ' + data.mensagem);
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('❌ Erro ao conectar com o servidor!');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle"></i> Registrar Matrícula UniEja';
    }
}

// =============================================
// LIMPAR FORMULÁRIO
// =============================================

function limparForm() {
    document.getElementById('formVenda').reset();
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    document.getElementById('dataHora').value = agora.toISOString().slice(0, 16);
}

// =============================================
// CARREGAR VENDAS
// =============================================

async function carregarVendas() {
    try {
        const response = await fetch(`${API_URL}?acao=listar-todas-vendas`);
        const data = await response.json();
        
        if (data.sucesso) {
            const tbody = document.getElementById('tabelaVendas');
            
            if (data.dados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666; padding: 2rem;">Nenhuma venda registrada</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.dados.map(v => `
                <tr>
                    <td>${v.id}</td>
                    <td>${v.data_hora}</td>
                    <td>${v.cliente}</td>
                    <td>${v.cliente_email}</td>
                    <td>${v.cliente_telefone}</td>
                    <td>${v.produto}</td>
                    <td>${v.vendedor}</td>
                    <td><strong style="color: #00ff88;">${formatarMoeda(v.valor)}</strong></td>
                    <td><span style="color: ${v.status === 'Aprovado' ? '#00ff88' : v.status === 'Pendente' ? '#ffaa00' : '#ff4081'};">${v.status}</span></td>
                </tr>
            `).join('');
            
            console.log('✅ Vendas carregadas:', data.dados.length);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar vendas:', error);
    }
}

// =============================================
// CARREGAR CLIENTES
// =============================================

async function carregarClientes() {
    try {
        const response = await fetch(`${API_URL}?acao=listar-clientes`);
        const data = await response.json();
        
        if (data.sucesso) {
            const tbody = document.getElementById('tabelaClientes');
            
            if (data.dados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666; padding: 2rem;">Nenhum cliente cadastrado</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.dados.map(c => `
                <tr>
                    <td>${c.cliente}</td>
                    <td>${c.cliente_email}</td>
                    <td>${c.cliente_telefone}</td>
                    <td>${c.total_compras}</td>
                    <td><strong style="color: #00ff88;">${formatarMoeda(c.total_gasto)}</strong></td>
                    <td>${formatarData(c.ultima_compra)}</td>
                </tr>
            `).join('');
            
            console.log('✅ Clientes carregados:', data.dados.length);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar clientes:', error);
    }
}

// =============================================
// CARREGAR PRODUTOS
// =============================================

async function carregarProdutos() {
    try {
        const response = await fetch(`${API_URL}?acao=listar-produtos`);
        const data = await response.json();
        
        if (data.sucesso) {
            const container = document.getElementById('listaProdutos');
            
            if (data.dados.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #666;">Nenhum produto cadastrado</p>';
                return;
            }
            
            container.innerHTML = data.dados.map(p => `
                <div class="produto-card">
                    <i class="bi bi-mortarboard"></i>
                    <h4>${p.nome}</h4>
                    <p>${p.descricao || 'Curso UniEja EJA'}</p>
                    <div class="preco">${formatarMoeda(p.preco)}</div>
                </div>
            `).join('');
            
            console.log('✅ Produtos carregados:', data.dados.length);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar produtos:', error);
    }
}

// =============================================
// CARREGAR VENDEDORES
// =============================================

async function carregarVendedores() {
    try {
        const response = await fetch(`${API_URL}?acao=listar-vendedores`);
        const data = await response.json();
        
        if (data.sucesso) {
            const container = document.getElementById('listaVendedores');
            
            if (data.dados.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #666;">Nenhum vendedor cadastrado</p>';
                return;
            }
            
            container.innerHTML = data.dados.map(v => `
                <div class="produto-card">
                    <img src="${v.foto}" alt="${v.nome}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 1rem; border: 3px solid #00ffff;">
                    <h4>${v.nome}</h4>
                    <p>${v.email}</p>
                </div>
            `).join('');
            
            console.log('✅ Vendedores carregados:', data.dados.length);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar vendedores:', error);
    }
}

// =============================================
// CARREGAR META
// =============================================

async function carregarMeta() {
    try {
        const response = await fetch(`${API_URL}?acao=buscar-meta`);
        const data = await response.json();
        
        if (data.sucesso) {
            document.getElementById('valorMeta').value = data.dados.valor_meta;
            console.log('✅ Meta carregada:', data.dados.valor_meta);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar meta:', error);
    }
}

// =============================================
// ATUALIZAR META
// =============================================

async function atualizarMeta(e) {
    e.preventDefault();
    
    const valor_meta = document.getElementById('valorMeta').value;
    
    if (!valor_meta || parseFloat(valor_meta) <= 0) {
        alert('❌ Valor da meta inválido!');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}?acao=definir-meta`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ valor_meta })
        });
        
        const data = await response.json();
        
        if (data.sucesso) {
            alert('✅ Meta atualizada com sucesso!\n\nNova meta: R$ ' + parseFloat(valor_meta).toFixed(2));
            carregarEstatisticas();
        } else {
            alert('❌ Erro: ' + data.mensagem);
        }
    } catch (error) {
        console.error('❌ Erro:', error);
        alert('❌ Erro ao conectar com o servidor!');
    }
}

// =============================================
// MÁSCARA DE TELEFONE
// =============================================

function aplicarMascaraTelefone(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length <= 10) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    } else {
        value = value.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3');
    }
    
    input.value = value;
}

// =============================================
// INICIALIZAÇÃO
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM pronto!');
    
    // Configurar data/hora atual
    const agora = new Date();
    agora.setMinutes(agora.getMinutes() - agora.getTimezoneOffset());
    document.getElementById('dataHora').value = agora.toISOString().slice(0, 16);
    
    // Carregar dados iniciais
    carregarEstatisticas();
    carregarSelects();
    
    // Event listeners
    document.getElementById('formVenda').addEventListener('submit', registrarVenda);
    document.getElementById('formMeta').addEventListener('submit', atualizarMeta);
    
    // Máscara de telefone
    const telefoneInput = document.getElementById('telefone');
    telefoneInput.addEventListener('input', function() {
        aplicarMascaraTelefone(this);
    });

    initAssistant();
    
    console.log('✅ Admin UniEja pronto!');
    console.log('📋 Sistema: UniEja EJA');
    console.log('🔗 API:', API_URL);
});