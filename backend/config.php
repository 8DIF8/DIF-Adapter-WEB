<?php

$DB_HOST = 'localhost';
$DB_NAME = 'difsleepy4';
$DB_USER = 'difsleepy4';
$DB_PASS = 'Zalupachos1001';

const ADMIN_PASSWORD_HASH = '32a8f55c37ff3989aaf0ada1aaadd601cb5186619c971e918462b41986038ca6';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'db_failed']);
    exit;
}

