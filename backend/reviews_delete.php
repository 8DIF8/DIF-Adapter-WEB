<?php

header('Access-Control-Allow-Origin: https://8dif8.github.io/DIF-Adapter-WEB');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require __DIR__ . '/config.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$id  = isset($data['id']) ? (int)$data['id'] : 0;
$pwd = isset($data['password']) ? (string)$data['password'] : '';

if ($id <= 0 || $pwd === '') {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'bad_request']);
    exit;
}

if (hash('sha256', $pwd) !== ADMIN_PASSWORD_HASH) {
    http_response_code(403);
    echo json_encode(['ok' => false, 'error' => 'forbidden']);
    exit;
}

try {
    $stmt = $pdo->prepare('DELETE FROM dif_reviews WHERE id = :id');
    $stmt->execute([':id' => $id]);
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'delete_failed']);
}

