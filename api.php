<?php

/**
 * =============================================
 * API COMPLETA - PROJETO SOLIMÕES | UNIEJA
 * Sistema 100% Funcional e Profissional
 * =============================================
 */

require_once 'config.php';

$allowedOrigins = getAllowedOrigins();
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$resolvedOrigin = '';

if ($origin !== '' && isOriginAllowed($origin, $allowedOrigins)) {
    $resolvedOrigin = $origin;
} elseif ($origin === '') {
    $resolvedOrigin = DEBUG_MODE ? '*' : ($allowedOrigins[0] ?? '*');
} else {
    header('Vary: Origin');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(403);
        exit;
    }
    jsonError('Origem não autorizada', 403);
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . $resolvedOrigin);
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Vary: Origin');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$db = Database::getInstance();
$acao = isset($_GET['acao']) ? $_GET['acao'] : '';
$currentUser = null;

$routesConfig = [
    'nova-venda' => ['methods' => ['POST'], 'auth' => true],
    'deletar-venda' => ['methods' => ['DELETE', 'POST'], 'auth' => true],
    'definir-meta' => ['methods' => ['POST'], 'auth' => true]
];

if (isset($routesConfig[$acao])) {
    enforceHttpMethod($routesConfig[$acao]['methods']);
    if (!empty($routesConfig[$acao]['auth'])) {
        $currentUser = requireAuthentication();
    }
}

// =============================================
// ROTEAMENTO
// =============================================

switch ($acao) {
    case 'teste':
        jsonSuccess([], 'API UniEja funcionando perfeitamente!');
        break;
    case 'resumo':
        buscarResumo();
        break;
    case 'vendas-dia':
        buscarVendasPorDia();
        break;
    case 'ranking-geral':
        buscarRankingGeral();
        break;
    case 'ranking-dia':
        buscarRankingDia();
        break;
    case 'ultimas-vendas':
        buscarUltimasVendas();
        break;
    case 'nova-venda':
        registrarVenda();
        break;
    case 'listar-todas-vendas':
        listarTodasVendas();
        break;
    case 'deletar-venda':
        deletarVenda();
        break;
    case 'listar-clientes':
        listarClientes();
        break;
    case 'listar-produtos':
        listarProdutos();
        break;
    case 'listar-vendedores':
        listarVendedores();
        break;
    case 'definir-meta':
        definirMeta();
        break;
    case 'buscar-meta':
        buscarMeta();
        break;
    case 'login':
        fazerLogin();
        break;
    default:
        jsonError('Ação inválida', 404);
}

// =============================================
// RESUMO GERAL (Dashboard Principal)
// =============================================

function buscarResumo()
{
    global $db;
    try {
        // Total e quantidade do mês
        $sql = "SELECT 
                    COUNT(*) as quantidade, 
                    COALESCE(SUM(valor), 0) as total
                FROM vendas 
                WHERE MONTH(data_hora) = MONTH(NOW())
                  AND YEAR(data_hora) = YEAR(NOW())
                  AND status = 'Aprovado'";
        $vendas_mes = $db->queryOne($sql);

        // Total e quantidade do dia
        $sql = "SELECT 
                    COUNT(*) as quantidade, 
                    COALESCE(SUM(valor), 0) as total
                FROM vendas 
                WHERE DATE(data_hora) = CURDATE()
                  AND status = 'Aprovado'";
        $vendas_dia = $db->queryOne($sql);

        // Ticket médio
        $ticket_medio = $vendas_mes['quantidade'] > 0
            ? $vendas_mes['total'] / $vendas_mes['quantidade']
            : 0;

        // Buscar meta do mês
        $sql = "SELECT valor_meta FROM metas 
                WHERE mes = MONTH(NOW()) AND ano = YEAR(NOW())";
        $meta = $db->queryOne($sql);

        if (!$meta) {
            // Criar meta padrão
            $sql = "INSERT INTO metas (mes, ano, valor_meta) 
                    VALUES (MONTH(NOW()), YEAR(NOW()), 200000.00)";
            $db->execute($sql);
            $valor_meta = 200000.00;
        } else {
            $valor_meta = floatval($meta['valor_meta']);
        }

        // Calcular porcentagem da meta
        $porcentagem_meta = $valor_meta > 0
            ? min(($vendas_mes['total'] / $valor_meta) * 100, 100)
            : 0;

        jsonSuccess([
            'total_mes' => floatval($vendas_mes['total']),
            'quantidade_mes' => intval($vendas_mes['quantidade']),
            'total_dia' => floatval($vendas_dia['total']),
            'quantidade_dia' => intval($vendas_dia['quantidade']),
            'ticket_medio' => floatval($ticket_medio),
            'meta' => floatval($valor_meta),
            'porcentagem_meta' => floatval($porcentagem_meta)
        ]);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao buscar resumo', $e), 500);
    }
}

// =============================================
// VENDAS POR DIA (Gráfico)
// =============================================

function buscarVendasPorDia()
{
    global $db;
    try {
        $sql = "SELECT 
                    DATE(data_hora) as data,
                    DATE_FORMAT(data_hora, '%d/%m') as dia,
                    COALESCE(SUM(valor), 0) as total,
                    COUNT(*) as quantidade
                FROM vendas
                WHERE data_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                  AND status = 'Aprovado'
                GROUP BY DATE(data_hora)
                ORDER BY DATE(data_hora) ASC";

        $vendas = $db->query($sql);

        $resultado = array_map(function ($v) {
            return [
                'dia' => $v['dia'],
                'data' => $v['data'],
                'total' => floatval($v['total']),
                'quantidade' => intval($v['quantidade'])
            ];
        }, $vendas);

        jsonSuccess($resultado);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao buscar vendas por dia', $e), 500);
    }
}

// =============================================
// RANKING GERAL (Mês)
// =============================================

function buscarRankingGeral()
{
    global $db;
    try {
        $sql = "SELECT 
                    v.id,
                    v.nome,
                    v.foto,
                    COUNT(vd.id) as total_vendas,
                    COALESCE(SUM(vd.valor), 0) as valor_total
                FROM vendedores v
                LEFT JOIN vendas vd ON v.id = vd.vendedor_id 
                    AND MONTH(vd.data_hora) = MONTH(NOW())
                    AND YEAR(vd.data_hora) = YEAR(NOW())
                    AND vd.status = 'Aprovado'
                WHERE v.ativo = TRUE
                GROUP BY v.id, v.nome, v.foto
                ORDER BY valor_total DESC";

        $ranking = $db->query($sql);

        $resultado = array_map(function ($v) {
            return [
                'id' => intval($v['id']),
                'nome' => $v['nome'],
                'foto' => $v['foto'],
                'total_vendas' => intval($v['total_vendas']),
                'valor_total' => floatval($v['valor_total'])
            ];
        }, $ranking);

        jsonSuccess($resultado);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao buscar ranking geral', $e), 500);
    }
}

// =============================================
// RANKING DIA
// =============================================

function buscarRankingDia()
{
    global $db;
    try {
        $sql = "SELECT 
                    v.id,
                    v.nome,
                    v.foto,
                    COUNT(vd.id) as total_vendas,
                    COALESCE(SUM(vd.valor), 0) as valor_total
                FROM vendedores v
                LEFT JOIN vendas vd ON v.id = vd.vendedor_id 
                    AND DATE(vd.data_hora) = CURDATE()
                    AND vd.status = 'Aprovado'
                WHERE v.ativo = TRUE
                GROUP BY v.id, v.nome, v.foto
                ORDER BY valor_total DESC";

        $ranking = $db->query($sql);

        $resultado = array_map(function ($v) {
            return [
                'id' => intval($v['id']),
                'nome' => $v['nome'],
                'foto' => $v['foto'],
                'total_vendas' => intval($v['total_vendas']),
                'valor_total' => floatval($v['valor_total'])
            ];
        }, $ranking);

        jsonSuccess($resultado);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao buscar ranking do dia', $e), 500);
    }
}

// =============================================
// ÚLTIMAS VENDAS
// =============================================

function buscarUltimasVendas()
{
    global $db;
    try {
        $limite = isset($_GET['limite']) ? intval($_GET['limite']) : 10;
        $limite = max(1, min(50, $limite));
        $intervaloHoras = isset($_GET['intervalo_horas']) ? intval($_GET['intervalo_horas']) : 24;
        $intervaloHoras = max(1, min(720, $intervaloHoras));

        $sql = "SELECT 
                                        v.id,
                                        DATE_FORMAT(v.data_hora, '%H:%i') as hora,
                                        DATE_FORMAT(v.data_hora, '%Y-%m-%d %H:%i:%s') as data_hora_completa,
                                        UNIX_TIMESTAMP(v.data_hora) as timestamp_unix,
                                        v.cliente,
                                        v.cliente_email,
                                        v.cliente_telefone,
                                        p.nome as produto,
                                        vd.nome as vendedor,
                                        v.valor,
                                        v.plataforma
                                FROM vendas v
                                INNER JOIN produtos p ON v.produto_id = p.id
                                INNER JOIN vendedores vd ON v.vendedor_id = vd.id
                                WHERE v.data_hora >= DATE_SUB(NOW(), INTERVAL $intervaloHoras HOUR)
                                    AND v.status = 'Aprovado'
                                ORDER BY v.data_hora DESC
                                LIMIT $limite";

        $vendas = $db->query($sql);

        $resultado = array_map(function ($v) {
            return [
                'id' => intval($v['id']),
                'hora' => $v['hora'],
                'data_hora' => $v['data_hora_completa'],
                'timestamp' => intval($v['timestamp_unix']),
                'cliente' => $v['cliente'],
                'cliente_email' => $v['cliente_email'],
                'cliente_telefone' => $v['cliente_telefone'],
                'produto' => $v['produto'],
                'vendedor' => $v['vendedor'],
                'valor' => floatval($v['valor']),
                'plataforma' => $v['plataforma']
            ];
        }, $vendas);

        jsonSuccess($resultado);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao buscar últimas vendas', $e), 500);
    }
}

// =============================================
// REGISTRAR VENDA
// =============================================

function registrarVenda()
{
    global $db;
    try {
        $json = file_get_contents('php://input');
        $dados = json_decode($json, true);

        // Validar campos obrigatórios
        $campos_obrigatorios = ['cliente', 'cliente_email', 'cliente_telefone', 'produto_id', 'vendedor_id', 'valor'];
        foreach ($campos_obrigatorios as $campo) {
            if (!isset($dados[$campo]) || empty($dados[$campo])) {
                jsonError("Campo obrigatório: $campo");
            }
        }

        // Validar email
        if (!filter_var($dados['cliente_email'], FILTER_VALIDATE_EMAIL)) {
            jsonError('Email inválido');
        }

        // Validar telefone
        $telefone = preg_replace('/\D/', '', $dados['cliente_telefone']);
        if (strlen($telefone) < 10) {
            jsonError('Telefone inválido - mínimo 10 dígitos');
        }

        $dataHora = isset($dados['data_hora']) && !empty($dados['data_hora'])
            ? $dados['data_hora']
            : date('Y-m-d H:i:s');

        $plataforma = 'Pagar.me'; // SEMPRE Pagar.me
        $status = isset($dados['status']) ? $dados['status'] : 'Aprovado';

        // Inserir venda
        $sql = "INSERT INTO vendas (data_hora, cliente, cliente_email, cliente_telefone, 
                                    produto_id, vendedor_id, valor, plataforma, status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $resultado = $db->execute($sql, [
            $dataHora,
            $dados['cliente'],
            $dados['cliente_email'],
            $dados['cliente_telefone'],
            $dados['produto_id'],
            $dados['vendedor_id'],
            $dados['valor'],
            $plataforma,
            $status
        ]);

        if ($resultado) {
            $vendaId = $db->lastInsertId();

            // Buscar informações completas da venda
            $sql = "SELECT v.*, p.nome as produto_nome, vd.nome as vendedor_nome
                    FROM vendas v
                    INNER JOIN produtos p ON v.produto_id = p.id
                    INNER JOIN vendedores vd ON v.vendedor_id = vd.id
                    WHERE v.id = ?";
            $vendaInfo = $db->queryOne($sql, [$vendaId]);

            jsonSuccess([
                'id' => $vendaId,
                'venda' => $vendaInfo,
                'mensagem' => 'Matrícula UniEja registrada com sucesso!'
            ], 'Venda registrada via Pagar.me');
        } else {
            jsonError('Erro ao registrar venda');
        }
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao registrar venda', $e), 500);
    }
}

// =============================================
// LISTAR TODAS AS VENDAS
// =============================================

function listarTodasVendas()
{
    global $db;
    try {
        $sql = "SELECT 
                    v.id,
                    DATE_FORMAT(v.data_hora, '%d/%m/%Y %H:%i') as data_hora,
                    v.cliente,
                    v.cliente_email,
                    v.cliente_telefone,
                    p.nome as produto,
                    p.preco as preco_produto,
                    vd.nome as vendedor,
                    v.valor,
                    v.plataforma,
                    v.status
                FROM vendas v
                INNER JOIN produtos p ON v.produto_id = p.id
                INNER JOIN vendedores vd ON v.vendedor_id = vd.id
                ORDER BY v.data_hora DESC";

        $vendas = $db->query($sql);
        jsonSuccess($vendas);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao listar vendas', $e), 500);
    }
}

// =============================================
// DELETAR VENDA
// =============================================

function deletarVenda()
{
    global $db;
    try {
        $id = isset($_GET['id']) ? intval($_GET['id']) : 0;

        if ($id <= 0) {
            jsonError('ID inválido');
        }

        $sql = "DELETE FROM vendas WHERE id = ?";
        $resultado = $db->execute($sql, [$id]);

        if ($resultado) {
            jsonSuccess([], 'Venda deletada com sucesso');
        } else {
            jsonError('Erro ao deletar venda');
        }
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao deletar venda', $e), 500);
    }
}

// =============================================
// LISTAR CLIENTES
// =============================================

function listarClientes()
{
    global $db;
    try {
        $sql = "SELECT DISTINCT 
                    cliente, 
                    cliente_email, 
                    cliente_telefone,
                    COUNT(*) as total_compras,
                    SUM(valor) as total_gasto,
                    MAX(data_hora) as ultima_compra
                FROM vendas
                WHERE status = 'Aprovado'
                GROUP BY cliente, cliente_email, cliente_telefone
                ORDER BY total_gasto DESC";

        $clientes = $db->query($sql);
        jsonSuccess($clientes);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao listar clientes', $e), 500);
    }
}

// =============================================
// LISTAR PRODUTOS
// =============================================

function listarProdutos()
{
    global $db;
    try {
        $sql = "SELECT id, nome, preco, descricao
                FROM produtos
                WHERE ativo = TRUE
                ORDER BY nome ASC";
        $produtos = $db->query($sql);
        jsonSuccess($produtos);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao listar produtos', $e), 500);
    }
}

// =============================================
// LISTAR VENDEDORES
// =============================================

function listarVendedores()
{
    global $db;
    try {
        $sql = "SELECT id, nome, email, foto
                FROM vendedores
                WHERE ativo = TRUE
                ORDER BY nome ASC";
        $vendedores = $db->query($sql);
        jsonSuccess($vendedores);
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao listar vendedores', $e), 500);
    }
}

// =============================================
// DEFINIR META
// =============================================

function definirMeta()
{
    global $db;
    try {
        $json = file_get_contents('php://input');
        $dados = json_decode($json, true);

        if (!isset($dados['valor_meta'])) {
            jsonError('Campo valor_meta é obrigatório');
        }

        $valor_meta = floatval($dados['valor_meta']);

        if ($valor_meta <= 0) {
            jsonError('Valor da meta deve ser maior que zero');
        }

        $sql = "INSERT INTO metas (mes, ano, valor_meta) 
                VALUES (MONTH(NOW()), YEAR(NOW()), ?)
                ON DUPLICATE KEY UPDATE valor_meta = ?";

        $resultado = $db->execute($sql, [$valor_meta, $valor_meta]);

        if ($resultado) {
            jsonSuccess([
                'valor_meta' => $valor_meta,
                'mes' => date('m'),
                'ano' => date('Y')
            ], 'Meta atualizada com sucesso!');
        } else {
            jsonError('Erro ao atualizar meta');
        }
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao definir meta', $e), 500);
    }
}

// =============================================
// BUSCAR META
// =============================================

function buscarMeta()
{
    global $db;
    try {
        $sql = "SELECT valor_meta, mes, ano FROM metas 
                WHERE mes = MONTH(NOW()) AND ano = YEAR(NOW())";
        $meta = $db->queryOne($sql);

        if ($meta) {
            jsonSuccess([
                'valor_meta' => floatval($meta['valor_meta']),
                'mes' => intval($meta['mes']),
                'ano' => intval($meta['ano'])
            ]);
        } else {
            // Criar meta padrão
            $sql = "INSERT INTO metas (mes, ano, valor_meta) 
                    VALUES (MONTH(NOW()), YEAR(NOW()), 200000.00)";
            $db->execute($sql);

            jsonSuccess([
                'valor_meta' => 200000.00,
                'mes' => intval(date('m')),
                'ano' => intval(date('Y'))
            ]);
        }
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao buscar meta', $e), 500);
    }
}

// =============================================
// LOGIN
// =============================================

function fazerLogin()
{
    global $db;
    try {
        $json = file_get_contents('php://input');
        $dados = json_decode($json, true);

        if (!is_array($dados)) {
            // Tentar fallback para POST tradicional (application/x-www-form-urlencoded)
            $dados = $_POST ?: [];
        }

        $email = trim($dados['email'] ?? '');
        $senha = (string)($dados['senha'] ?? '');

        if ($email === '' || $senha === '') {
            jsonError('Email e senha são obrigatórios');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            jsonError('Email inválido');
        }

        $sql = "SELECT id, nome, email, cargo, foto, senha
                FROM usuarios
                WHERE email = ? AND ativo = TRUE
                LIMIT 1";

        $usuario = $db->queryOne($sql, [$email]);

        if ($usuario) {
            $senhaBanco = $usuario['senha'] ?? '';
            $senhaValida = false;

            if ($senhaBanco !== '') {
                $infoHash = password_get_info($senhaBanco);

                if (($infoHash['algo'] ?? 0) !== 0) {
                    $senhaValida = password_verify($senha, $senhaBanco);
                } else {
                    $senhaValida = hash_equals($senhaBanco, md5($senha));
                }
            }

            if (!$senhaValida) {
                jsonError('Email ou senha incorretos');
            }

            unset($usuario['senha']);
            // Atualizar último acesso
            $sql = "UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = ?";
            $db->execute($sql, [$usuario['id']]);

            $jwt = createJwt([
                'sub' => intval($usuario['id']),
                'nome' => $usuario['nome'],
                'email' => $usuario['email'],
                'cargo' => $usuario['cargo']
            ]);

            jsonSuccess([
                'token' => $jwt['token'],
                'expira_em' => $jwt['payload']['exp'],
                'usuario_id' => intval($usuario['id']),
                'nome' => $usuario['nome'],
                'email' => $usuario['email'],
                'cargo' => $usuario['cargo'],
                'foto' => $usuario['foto']
            ], 'Login realizado com sucesso');
        } else {
            jsonError('Email ou senha incorretos');
        }
    } catch (Exception $e) {
        logException($e);
        jsonError(formatErrorMessage('Erro ao fazer login', $e), 500);
    }
}

// =============================================
// CONTROLES DE REQUISIÇÃO
// =============================================

function enforceHttpMethod(array $allowedMethods): void
{
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    $allowed = array_map('strtoupper', $allowedMethods);

    if (!in_array($method, $allowed, true)) {
        jsonError('Método não permitido', 405);
    }
}

function requireAuthentication(): array
{
    $token = getBearerTokenFromHeaders();

    if (!$token && isset($_GET['token'])) {
        $token = trim($_GET['token']);
    }

    if (!$token) {
        jsonError('Não autorizado', 401);
    }

    $payload = validateJwt($token);

    if (!$payload) {
        jsonError('Token inválido ou expirado', 401);
    }

    return $payload;
}
