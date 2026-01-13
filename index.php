<?php
// Se o domínio estiver apontando para a subpasta frontend, redireciona para raiz primeira vez
if (strpos($_SERVER['REQUEST_URI'], 'frontend-aluno') !== false) {
  header('Location: /');
  exit;
}

$target = 'frontend-aluno/index.html';

if (!empty($_SERVER['QUERY_STRING'])) {
  $target .= '?' . $_SERVER['QUERY_STRING'];
}

header('Location: ' . $target);
exit;
