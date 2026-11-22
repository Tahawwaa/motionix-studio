<?php

return [
    'worker_url' => env('NOVA_WORKER_URL', 'http://127.0.0.1:8001'),
    'api_token' => env('NOVA_API_TOKEN', ''),
    'origins' => ['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:8000', 'http://localhost:8000'],
    'upload_limit' => 100 * 1024 * 1024,
];
