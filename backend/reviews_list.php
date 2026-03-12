<?php

header('Access-Control-Allow-Origin: https://8dif8.github.io/DIF-Adapter-WEB');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

require __DIR__ . '/config.php';

try {
    $stmt = $pdo->query('SELECT id, rating, text, DATE_FORMAT(created_at, "%d.%m.%y %H:%i") AS created_at FROM dif_reviews ORDER BY id DESC LIMIT 200');
    $rows = $stmt->fetchAll();
    $count = count($rows);
    $sum = 0;
    $ratedCount = 0;
    foreach ($rows as $r) {
        if (isset($r['rating']) && (int)$r['rating'] >= 1 && (int)$r['rating'] <= 5) {
            $sum += (int)$r['rating'];
            $ratedCount++;
        }
    }
    $avg = $ratedCount ? $sum / $ratedCount : 0;

    echo json_encode([
        'ok'      => true,
        'count'   => $count,
        'avg'     => $avg,
        'reviews' => $rows,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'select_failed']);
}

