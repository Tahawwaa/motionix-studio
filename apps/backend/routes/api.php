<?php

use App\Http\Controllers\BackupController;
use App\Http\Controllers\DirectorController;
use App\Http\Controllers\StudioController;
use Illuminate\Support\Facades\Route;

Route::middleware('throttle:180,1,nova-api-')->group(function (): void {
    Route::get('/health', [StudioController::class, 'health']);
    Route::post('/projects/import-backup', [BackupController::class, 'restore'])->middleware('throttle:5,1,nova-backups-');
    Route::get('/projects/{project}/backup', [BackupController::class, 'download']);
    Route::get('/director/status', [DirectorController::class, 'status']);
    Route::post('/director', [DirectorController::class, 'generate'])->middleware('throttle:5,1,nova-director-');
    Route::get('/projects', [StudioController::class, 'projects']);
    Route::post('/projects', [StudioController::class, 'createProject']);
    Route::get('/projects/{project}', [StudioController::class, 'project']);
    Route::put('/projects/{project}', [StudioController::class, 'updateProject']);
    Route::delete('/projects/{project}', [StudioController::class, 'deleteProject']);
    Route::get('/projects/{project}/versions', [StudioController::class, 'versions']);
    Route::get('/projects/{project}/versions/{version}', [StudioController::class, 'version'])->whereNumber('version');
    Route::post('/projects/{project}/versions/{version}/restore', [StudioController::class, 'restore'])->whereNumber('version');
    Route::get('/assets', [StudioController::class, 'assets']);
    Route::get('/assets/{asset}', [StudioController::class, 'asset']);
    Route::post('/assets', [StudioController::class, 'upload'])->middleware('throttle:20,1,nova-uploads-');
    Route::patch('/assets/{asset}', [StudioController::class, 'updateAsset']);
    Route::delete('/assets/{asset}', [StudioController::class, 'deleteAsset']);
    Route::get('/settings', [StudioController::class, 'settings']);
    Route::put('/settings', [StudioController::class, 'updateSettings']);
    Route::get('/brands', [StudioController::class, 'brands']);
    Route::post('/brands', [StudioController::class, 'createBrand']);
    Route::put('/brands/{brand}', [StudioController::class, 'updateBrand']);
    Route::get('/activity', [StudioController::class, 'activity']);
    Route::post('/activity', [StudioController::class, 'logActivity']);
    Route::get('/templates', [StudioController::class, 'templates']);
    Route::post('/templates', [StudioController::class, 'saveTemplate']);
    Route::get('/storage', [StudioController::class, 'storage']);
});
