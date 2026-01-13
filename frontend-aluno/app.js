const dataset = document.body?.dataset || {};
const API_ENDPOINT = dataset.api || '../api.php';
const PRODUCT_ROUTE = `${API_ENDPOINT}?acao=listar-produtos`;
const LEAD_URL = dataset.lead || '../index.php';

const fallbackCourses = [
    {
        id: 1,
        title: 'EJA Digital Multicompetências',
        category: 'EJA',
        mode: 'online',
        duration: 10,
        price: 187,
        badge: 'Novo módulo socioemocional',
        start: '08 Fev',
        popularity: 5,
        description: 'Acelere a conclusão do Ensino Médio com metodologias ativas e acompanhamento diário.',
        skills: ['Projeto de vida', 'Comunicação', 'Cidadania Digital']
    },
    {
        id: 2,
        title: 'Tecnólogo em Gestão Ambiental',
        category: 'Tecnológico',
        mode: 'hibrido',
        duration: 24,
        price: 327,
        badge: 'Foco Amazônia',
        start: '19 Mar',
        popularity: 4,
        description: 'Integre tecnologia e sustentabilidade em projetos conectados às demandas da floresta.',
        skills: ['Legislação ambiental', 'Sensoriamento', 'Projetos ESG']
    },
    {
        id: 3,
        title: 'Formação Tech Express',
        category: 'Tecnologia',
        mode: 'online',
        duration: 6,
        price: 259,
        badge: 'Career Week incluída',
        start: '29 Jan',
        popularity: 5,
        description: 'Trilha prática de desenvolvimento web moderno com foco em empregabilidade imediata.',
        skills: ['JavaScript moderno', 'APIs', 'UX Básico']
    },
    {
        id: 4,
        title: 'Saúde Integrativa e Bem-estar',
        category: 'Saúde',
        mode: 'presencial',
        duration: 18,
        price: 298,
        badge: 'Novas clínicas parceiras',
        start: '05 Abr',
        popularity: 3,
        description: 'Conteúdo aplicado em laboratórios e vivências para atuar em programas comunitários de saúde.',
        skills: ['Atendimento humanizado', 'Fisiologia', 'Práticas Integrativas']
    },
    {
        id: 5,
        title: 'Operador Logístico Inteligente',
        category: 'Profissionalizante',
        mode: 'hibrido',
        duration: 8,
        price: 219,
        badge: '30h labs industriais',
        start: '15 Fev',
        popularity: 4,
        description: 'Domine rotinas de supply chain com foco em e-commerce e polos industriais do Amazonas.',
        skills: ['Lean', 'ERP', 'Gestão de estoque']
    },
    {
        id: 6,
        title: 'Criação Digital e Motion',
        category: 'Tecnologia',
        mode: 'online',
        duration: 7,
        price: 247,
        badge: 'Adobe Partner',
        start: '12 Fev',
        popularity: 3,
        description: 'Design visual, edição e motion graphics para social media e campanhas institucionais.',
        skills: ['Motion', 'Branding', 'Storytelling']
    },
    {
        id: 7,
        title: 'Produção de Conteúdo Educacional',
        category: 'Profissionalizante',
        mode: 'online',
        duration: 5,
        price: 199,
        badge: 'Bootcamp intensivo',
        start: '22 Jan',
        popularity: 4,
        description: 'Aprenda a roteirizar, gravar e distribuir aulas multimídia para diferentes audiências.',
        skills: ['Roteiro', 'Captação', 'Learning Experience']
    },
    {
        id: 8,
        title: 'Tecnólogo em Segurança da Informação',
        category: 'Tecnológico',
        mode: 'hibrido',
        duration: 24,
        price: 352,
        badge: 'Lab cibersegurança',
        start: '02 Mar',
        popularity: 5,
        description: 'Formação completa em defesa de dados, com simulações de incidentes e SOC remoto.',
        skills: ['Pentest', 'Cloud', 'Governança']
    }
];

let courses = [];
let isLoadingCourses = true;
let loadErrorMessage = '';

const metadataOverrides = fallbackCourses.reduce((acc, course) => {
    acc[course.title.toLowerCase()] = course;
    return acc;
}, {});

const state = {
    search: '',
    category: 'todos',
    mode: 'todos',
    sort: 'popularidade',
    selected: null
};

const courseGrid = document.getElementById('courseGrid');
const insight = document.getElementById('courseInsight');
const insightList = document.getElementById('insightList');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const chipGroup = document.getElementById('filterChips');
const toggleGroup = document.querySelector('.toggle-group');
const insightButton = insight.querySelector('button');
const insightTitle = insight.querySelector('h3');
const insightDescription = insight.querySelector('p');
const assistantToggle = document.getElementById('assistantToggle');
const assistantClose = document.getElementById('assistantClose');
const assistantPanel = document.getElementById('assistantPanel');
const assistantMessages = document.getElementById('assistantMessages');
const assistantActions = document.getElementById('assistantActions');
const assistantForm = document.getElementById('assistantForm');
const assistantInput = document.getElementById('assistantInput');

const defaultInsightState = {
    title: insightTitle.textContent,
    description: insightDescription.textContent
};

const assistantState = {
    open: false,
    resumo: null,
    isResponding: false
};

function hashString(value = '') {
    return value.split('').reduce((acc, char) => {
        acc = (acc << 5) - acc + char.charCodeAt(0);
        return acc & acc;
    }, 0);
}

function pickFromArray(list, seed) {
    if (!list.length) {
        return null;
    }
    const index = Math.abs(seed) % list.length;
    return list[index];
}

function generateFutureStart(seed) {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 7 * ((Math.abs(seed) % 6) + 1));
    return baseDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function buildMetadata(product, index) {
    const fallback = metadataOverrides[(product.nome || '').toLowerCase()] || {};
    const seed = hashString(product.nome || product.id?.toString() || '') + index;
    const categories = ['EJA', 'Tecnologia', 'Tecnológico', 'Profissionalizante', 'Saúde'];
    const modes = ['online', 'hibrido', 'presencial'];
    const badges = ['Mentoria dedicada', 'Vagas limitadas', 'Certificação dupla', 'Career Week inclusa'];
    const descriptionTemplates = [
        'Trilha pensada para quem busca resultados rápidos com acompanhamento do hub UniEJA.',
        'Conteúdos atualizados com foco em desafios reais do mercado amazônico.',
        'Aprenda com especialistas atuantes e acelere sua trajetória profissional.'
    ];
    const skillsPool = [
        ['Comunicação', 'Gestão de projetos', 'Pensamento crítico'],
        ['Tecnologia', 'Analytics', 'UX'],
        ['Sustentabilidade', 'Operações', 'People Skills'],
        ['Saúde', 'Cuidado humanizado', 'Práticas integrativas']
    ];

    const generated = {
        category: pickFromArray(categories, seed) || 'Tecnologia',
        mode: pickFromArray(modes, seed + 1) || 'online',
        duration: 6 + (Math.abs(seed) % 18),
        price: Number(product.preco || fallback.price || 0),
        badge: pickFromArray(badges, seed + 2),
        start: generateFutureStart(seed + 3),
        popularity: 3 + (Math.abs(seed) % 3),
        description: pickFromArray(descriptionTemplates, seed + 4),
        skills: pickFromArray(skillsPool, seed + 5) || ['Empregabilidade', 'Soft skills']
    };

    return {
        id: product.id || fallback.id,
        title: product.nome || fallback.title,
        category: fallback.category || generated.category,
        mode: fallback.mode || generated.mode,
        duration: fallback.duration || generated.duration,
        price: Number(product.preco ?? fallback.price ?? generated.price),
        badge: fallback.badge || generated.badge,
        start: fallback.start || generated.start,
        popularity: fallback.popularity || generated.popularity,
        description: product.descricao || fallback.description || generated.description,
        skills: (fallback.skills && fallback.skills.length ? fallback.skills : generated.skills)
    };
}

function formatModeLabel(mode) {
    const modes = {
        online: '100% online',
        hibrido: 'Híbrido',
        presencial: 'Presencial'
    };
    return modes[mode] || 'Formato flexível';
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function resetInsight() {
    state.selected = null;
    insightTitle.textContent = defaultInsightState.title;
    insightDescription.textContent = defaultInsightState.description;
    insightList.innerHTML = '';
    insightButton.disabled = true;
    insightButton.textContent = 'Quero garantir minha vaga';
}

async function loadCoursesFromApi() {
    isLoadingCourses = true;
    loadErrorMessage = '';
    renderCourses();

    try {
        const response = await fetch(PRODUCT_ROUTE);
        const payload = await response.json();

        if (!response.ok || !payload.sucesso) {
            throw new Error(payload.mensagem || 'Falha no catálogo');
        }

        const produtos = Array.isArray(payload.dados) ? payload.dados : [];
        courses = produtos.map((produto, index) => buildMetadata(produto, index));
    } catch (error) {
        console.error('Erro ao carregar cursos da API:', error);
        loadErrorMessage = 'Não consegui conectar ao catálogo agora. Mostrando sugestões para você continuar explorando.';
        courses = fallbackCourses.map(course => ({ ...course }));
    } finally {
        isLoadingCourses = false;
        resetInsight();
        renderCourses();
    }
}

function filterCourses() {
    if (!Array.isArray(courses)) {
        return [];
    }

    return courses
        .filter(course => {
            const matchesCategory = state.category === 'todos' || course.category === state.category;
            const matchesMode = state.mode === 'todos' || course.mode === state.mode;
            const term = state.search.toLowerCase();
            const matchesSearch = !term ||
                course.title.toLowerCase().includes(term) ||
                course.category.toLowerCase().includes(term) ||
                course.description.toLowerCase().includes(term);
            return matchesCategory && matchesMode && matchesSearch;
        })
        .sort((a, b) => {
            if (state.sort === 'duracao') {
                return a.duration - b.duration;
            }
            if (state.sort === 'investimento') {
                return a.price - b.price;
            }
            return b.popularity - a.popularity;
        });
}

function renderCourses() {
    courseGrid.innerHTML = '';

    if (isLoadingCourses) {
        courseGrid.innerHTML = '<p class="empty loading">Carregando cursos e trilhas disponíveis...</p>';
        return;
    }

    if (loadErrorMessage) {
        const notice = document.createElement('div');
        notice.className = 'notice warning';
        notice.textContent = loadErrorMessage;
        notice.style.gridColumn = '1 / -1';
        courseGrid.appendChild(notice);
    }

    const filtered = filterCourses();

    if (filtered.length === 0) {
        courseGrid.innerHTML = '<p class="empty">Nenhum curso encontrado. Tente outra combinação 👍</p>';
        return;
    }

    filtered.forEach((course, index) => {
        const card = document.createElement('article');
        card.className = 'course-card';
        card.style.animationDelay = `${index * 40}ms`;
        const formattedPrice = formatCurrency(course.price);
        const badgeHtml = course.badge ? `<div class="badge">${course.badge}</div>` : '';
        const nextStart = course.start || 'Em breve';
        card.innerHTML = `
            <small>${course.category}</small>
            <h3>${course.title}</h3>
            <p>${course.description}</p>
            <div class="course-meta">
                <span>${formatModeLabel(course.mode)}</span>
                <span>${course.duration} meses</span>
                <span>Próxima turma ${nextStart}</span>
            </div>
            <div class="course-price">
                <span>Investimento mensal</span>
                <strong>R$ ${formattedPrice}</strong>
            </div>
            ${badgeHtml}
        `;
        card.addEventListener('click', () => selectCourse(course));
        courseGrid.appendChild(card);
    });
}

function selectCourse(course) {
    state.selected = course;
    insightTitle.textContent = course.title;
    insightDescription.textContent = course.description;
    insightButton.disabled = false;
    insightButton.textContent = 'Quero saber mais';

    const items = [
        ['Formato', formatModeLabel(course.mode)],
        ['Duração', `${course.duration} meses`],
        ['Próxima turma', course.start || 'Em breve'],
        ['Skills', (course.skills && course.skills.length) ? course.skills.join(' · ') : 'Conteúdos sendo atualizados'],
        ['Investimento', `R$ ${formatCurrency(course.price)}/mês`]
    ];

    insightList.innerHTML = items.map(([label, value]) => (
        `<li><span>${label}</span><strong>${value}</strong></li>`
    )).join('');
}

function handleChipClick(event) {
    const chip = event.target.closest('.chip');
    if (!chip) return;

    chipGroup.querySelectorAll('.chip').forEach(btn => btn.classList.remove('active'));
    chip.classList.add('active');
    state.category = chip.dataset.filter;
    renderCourses();
}

function handleModeToggle(event) {
    const toggle = event.target.closest('.toggle');
    if (!toggle) return;

    toggleGroup.querySelectorAll('.toggle').forEach(btn => btn.classList.remove('active'));
    toggle.classList.add('active');
    state.mode = toggle.dataset.mode;
    renderCourses();
}

function toggleAssistant(forceState) {
    if (!assistantPanel) return;
    const nextState = typeof forceState === 'boolean' ? forceState : !assistantState.open;
    assistantState.open = nextState;
    assistantPanel.classList.toggle('open', nextState);
}

function getAssistantTimestamp() {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function appendAssistantMessage(text, sender = 'bot') {
    if (!assistantMessages) return;
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
        const response = await fetch(`${API_ENDPOINT}?acao=resumo`);
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
            return `Hoje registramos ${resumo.quantidade_dia} matrículas (R$ ${formatCurrency(resumo.total_dia)}). No mês já são ${resumo.quantidade_mes} matrículas somando ${formatCurrency(resumo.total_mes)}. Posso te conectar com um mentor para acelerar sua inscrição.`;
        }
        return 'Ainda não consegui puxar o painel, mas posso pedir para um mentor entrar em contato em instantes.';
    }

    if (normalized.includes('bolsa') || normalized.includes('desconto')) {
        return 'Mantemos bolsas parciais em dias específicos da semana. Fale com um mentor e informe que veio pelo portal para desbloquear as condições vigentes.';
    }

    if (normalized.includes('curso') || normalized.includes('trilha') || normalized.includes('terminar')) {
        return 'Os cursos EJA podem ser concluídos em até 10 meses com acompanhamento individual. Escolha uma trilha e clique em "Quero saber mais" para receber o plano completo.';
    }

    return 'Anotei seu pedido. Um mentor UniEJA pode te retornar em até 10 minutos pelo WhatsApp, basta preencher o formulário do botão "Quero saber mais".';
}

async function handleAssistantQuestion(question) {
    if (!question.trim()) {
        return;
    }
    appendAssistantMessage(question, 'user');
    assistantState.isResponding = true;
    const reply = await buildAssistantAnswer(question);
    appendAssistantMessage(reply, 'bot');
    assistantState.isResponding = false;
}

function initAssistant() {
    if (!assistantPanel) {
        return;
    }

    assistantToggle?.addEventListener('click', () => toggleAssistant());
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
        const value = assistantInput.value.trim();
        assistantInput.value = '';
        handleAssistantQuestion(value);
    });
}

function init() {
    renderCourses();
    searchInput.addEventListener('input', (e) => {
        state.search = e.target.value.trim();
        renderCourses();
    });
    sortSelect.addEventListener('change', (e) => {
        state.sort = e.target.value;
        renderCourses();
    });
    chipGroup.addEventListener('click', handleChipClick);
    toggleGroup.addEventListener('click', handleModeToggle);
    insightButton.addEventListener('click', () => {
        if (!state.selected) {
            return;
        }
        window.location.href = `${LEAD_URL}?curso=${encodeURIComponent(state.selected.title)}`;
    });
    loadCoursesFromApi();
    initAssistant();
}

init();
