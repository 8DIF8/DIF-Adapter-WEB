<?php

// Разрешаем CORS только с твоего GitHub Pages (ОБНОВИ URL!)
header('Access-Control-Allow-Origin: https://8dif8.github.io/DIF-Adapter-WEB');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require __DIR__ . '/config.php';

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

$text   = isset($data['text']) ? trim((string)$data['text']) : '';
$rating = isset($data['rating']) ? (int)$data['rating'] : 0;

if ($rating < 1 || $rating > 5 || mb_strlen($text) < 8 || mb_strlen($text) > 600) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'validation_failed']);
    exit;
}

// Лёгкий анти-спам по IP (захешированному)
$ip = $_SERVER['REMOTE_ADDR'] ?? '';
$ipHash = $ip ? hash('sha256', $ip) : null;

try {
    $stmt = $pdo->prepare('INSERT INTO dif_reviews (rating, text, ip_hash) VALUES (:rating, :text, :ip_hash)');
    $stmt->execute([
        ':rating' => $rating,
        ':text'   => $text,
        ':ip_hash'=> $ipHash,
    ]);
    echo json_encode(['ok' => true]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'insert_failed']);
}

