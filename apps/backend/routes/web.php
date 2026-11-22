<?php

use App\Http\Controllers\StudioController;
use Illuminate\Support\Facades\Route;

Route::get('/storage/assets/{filename}', [StudioController::class, 'serveAsset'])->where('filename', '[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+');
Route::get('/', fn () => response()->json(['application' => 'NOVA Motion Studio API', 'studio' => 'http://127.0.0.1:5173']));
