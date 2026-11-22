<?php

namespace Database\Factories;

use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Project> */
class ProjectFactory extends Factory
{
    public function definition(): array
    {
        $id = fake()->uuid();
        $name = fake()->words(3, true);
        $time = now()->toIso8601String();
        $data = ['schemaVersion' => 1, 'id' => $id, 'name' => $name, 'description' => '', 'width' => 1080, 'height' => 1920, 'fps' => 30, 'scenes' => [['id' => fake()->uuid(), 'name' => 'Opening', 'type' => 'typography', 'startFrame' => 0, 'duration' => 90, 'background' => '#09090B', 'accent' => '#2563EB', 'title' => 'Your next big idea.', 'subtitle' => 'Made to move.', 'eyebrow' => 'NOVA STUDIO', 'layers' => [], 'transition' => 'fade', 'transitionDuration' => 18, 'effects' => ['grain', 'vignette'], 'camera' => ['projection' => 'perspective', 'path' => 'orbit', 'intensity' => 0.6, 'fov' => 42]]], 'tracks' => [['id' => 'scenes', 'name' => 'Scenes', 'type' => 'scene', 'locked' => false, 'hidden' => false, 'muted' => false, 'solo' => false]], 'assets' => [], 'brand' => ['name' => 'NOVA Studio', 'primary' => '#2563EB', 'secondary' => '#06B6D4', 'background' => '#09090B', 'font' => 'Inter', 'cta' => 'Let’s build something extraordinary.'], 'archived' => false, 'createdAt' => $time, 'updatedAt' => $time];

        return ['id' => $id, 'name' => $name, 'archived' => false, 'data' => $data];
    }
}
