<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $t): void {
            $t->string('id', 100)->primary();
            $t->string('name', 200)->index();
            $t->boolean('archived')->default(false)->index();
            $t->json('data');
            $t->timestamps();
        });
        Schema::create('project_revisions', function (Blueprint $t): void {
            $t->id();
            $t->string('project_id', 100);
            $t->foreign('project_id')->references('id')->on('projects')->cascadeOnDelete();
            $t->unsignedInteger('version');
            $t->json('data');
            $t->timestamps();
            $t->unique(['project_id', 'version']);
        });
        Schema::create('assets', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->string('name')->index();
            $t->string('type', 20)->index();
            $t->json('data');
            $t->timestamps();
        });
        Schema::create('settings', function (Blueprint $t): void {
            $t->string('key')->primary();
            $t->json('value');
            $t->timestamps();
        });
        Schema::create('brand_profiles', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->json('data');
            $t->timestamps();
        });
        Schema::create('activities', function (Blueprint $t): void {
            $t->id();
            $t->string('action', 120)->index();
            $t->string('subject', 200)->nullable();
            $t->json('details')->nullable();
            $t->timestamps();
        });
        Schema::create('saved_templates', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->string('name', 200);
            $t->json('data');
            $t->timestamps();
        });
        Schema::create('render_records', function (Blueprint $t): void {
            $t->string('id', 100)->primary();
            $t->string('project_id', 100)->nullable()->index();
            $t->unsignedInteger('project_version')->nullable();
            $t->string('status', 30)->index();
            $t->json('settings');
            $t->json('data');
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['render_records', 'saved_templates', 'activities', 'brand_profiles', 'settings', 'assets', 'project_revisions', 'projects'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
