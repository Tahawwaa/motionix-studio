<?php

namespace Database\Factories;

use App\Models\Asset;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Storage;

/** @extends Factory<Asset> */
class AssetFactory extends Factory
{
    public function definition(): array
    {
        $id = fake()->uuid();
        $name = 'test-pixel.png';
        $bytes = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
        Storage::disk('local')->put('assets/'.$id.'.png', $bytes);
        $data = ['id' => $id, 'name' => $name, 'type' => 'image', 'path' => '/storage/assets/'.$id.'.png', 'mime' => 'image/png', 'size' => strlen($bytes), 'tags' => [], 'folder' => 'Library', 'createdAt' => now()->toIso8601String()];

        return ['id' => $id, 'name' => $name, 'type' => 'image', 'data' => $data];
    }
}
