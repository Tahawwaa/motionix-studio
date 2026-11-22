<?php

namespace Tests\Feature;

use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;
use ZipArchive;

class BackupSecurityTest extends TestCase
{
    use RefreshDatabase;

    private function project(array $assets = []): array
    {
        return ['schemaVersion' => 1, 'id' => 'portable-project', 'name' => 'Persian studio', 'width' => 1080, 'height' => 1920, 'fps' => 30, 'description' => '', 'scenes' => [['id' => 'scene-a', 'name' => 'Scene', 'type' => 'typography', 'startFrame' => 0, 'duration' => 90, 'title' => 'وب‌سایت آیندهٔ شما', 'layers' => $assets ? [['id' => 'image-a', 'name' => 'Asset', 'type' => 'image', 'trackId' => 'images', 'startFrame' => 0, 'duration' => 90, 'assetId' => $assets[0]['id']]] : []]], 'tracks' => [['id' => 'images', 'name' => 'Images', 'type' => 'image']], 'assets' => $assets, 'brand' => ['name' => 'NOVA', 'primary' => '#2563EB', 'secondary' => '#06B6D4', 'background' => '#09090B', 'font' => 'Vazirmatn', 'cta' => 'شروع کنیم'], 'archived' => false, 'createdAt' => '2026-11-21T00:00:00Z', 'updatedAt' => '2026-11-21T00:00:00Z'];
    }

    private function validator(): void
    {
        Http::preventStrayRequests();
        Http::fake(['127.0.0.1:8001/worker/validate' => fn ($r) => Http::response(['project' => $r->data()])]);
    }

    private function archive(array $entries): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'nova-test-');
        $zip = new ZipArchive;
        $zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        foreach ($entries as $name => $contents) {
            $zip->addFromString($name, $contents);
        }$zip->close();
        $file = UploadedFile::fake()->createWithContent('backup.zip', file_get_contents($path));
        unlink($path);

        return $file;
    }

    public function test_portable_backup_restores_assets_with_new_ids_and_editable_persian_text(): void
    {
        Storage::fake('local');
        $this->validator();
        $asset = $this->post('/api/assets', ['file' => UploadedFile::fake()->image('screen.png', 20, 20)], ['Accept' => 'application/json'])->assertCreated()->json();
        $p = $this->project([$asset]);
        $this->postJson('/api/projects', $p)->assertCreated();
        $response = $this->get('/api/projects/portable-project/backup')->assertOk();
        $path = $response->baseResponse->getFile()->getPathname();
        $backup = UploadedFile::fake()->createWithContent('restore.zip', file_get_contents($path));
        $restored = $this->post('/api/projects/import-backup', ['file' => $backup], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('scenes.0.title', 'وب‌سایت آیندهٔ شما')->json();
        $this->assertNotSame($p['id'], $restored['id']);
        $this->assertNotSame($asset['id'], $restored['assets'][0]['id']);
        $this->assertSame($restored['assets'][0]['id'], $restored['scenes'][0]['layers'][0]['assetId']);
        $this->get($restored['assets'][0]['path'])->assertOk();
        $this->assertDatabaseCount('projects', 2);
        unlink($path);
    }

    public function test_archive_traversal_is_rejected_before_validation_or_extraction(): void
    {
        $this->validator();
        $file = $this->archive(['../outside.txt' => 'bad', 'project.json' => json_encode($this->project())]);
        $this->post('/api/projects/import-backup', ['file' => $file], ['Accept' => 'application/json'])->assertUnprocessable();
        Http::assertNothingSent();
        $this->assertDatabaseCount('projects', 0);
    }

    public function test_archive_entry_count_is_limited(): void
    {
        $entries = ['project.json' => json_encode($this->project())];
        for ($i = 0; $i < 502; $i++) {
            $entries['assets/'.$i.'.png'] = 'x';
        }$this->post('/api/projects/import-backup', ['file' => $this->archive($entries)], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_corrupt_backup_and_missing_manifest_are_rejected(): void
    {
        $this->post('/api/projects/import-backup', ['file' => UploadedFile::fake()->createWithContent('bad.zip', 'not a zip')], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->post('/api/projects/import-backup', ['file' => $this->archive(['assets/image.png' => 'none'])], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_import_rolls_back_when_asset_signature_is_invalid(): void
    {
        Storage::fake('local');
        $this->validator();
        $asset = ['id' => 'old-asset', 'name' => 'screen.png', 'type' => 'image', 'path' => '/storage/assets/old-asset.png', 'mime' => 'image/png', 'size' => 10, 'createdAt' => '2026-11-21'];
        $p = $this->project([$asset]);
        $this->post('/api/projects/import-backup', ['file' => $this->archive(['project.json' => json_encode($p), 'assets/old-asset.png' => '<script>bad</script>'])], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount('assets', 0);
        $this->assertDatabaseCount('projects', 0);
        $this->assertCount(0, Storage::disk('local')->allFiles('assets'));
    }

    public function test_glb_with_external_network_reference_is_rejected(): void
    {
        Storage::fake('local');
        $json = json_encode(['asset' => ['version' => '2.0'], 'buffers' => [['uri' => 'http://169.254.169.254/latest/meta-data']]]);
        $json = str_pad($json, (int) ceil(strlen($json) / 4) * 4, ' ');
        $glb = 'glTF'.pack('V', 2).pack('V', 20 + strlen($json)).pack('V', strlen($json)).'JSON'.$json;
        $this->post('/api/assets', ['file' => UploadedFile::fake()->createWithContent('unsafe.glb', $glb)], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
        $this->assertDatabaseCount('assets', 0);
    }

    public function test_svg_scripts_and_external_references_are_rejected(): void
    {
        $source = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
        $this->post('/api/assets', ['file' => UploadedFile::fake()->createWithContent('unsafe.svg', $source)], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_director_without_provider_returns_real_disconnected_status(): void
    {
        $this->getJson('/api/director/status')->assertOk()->assertJsonPath('state', 'disconnected');
        $this->postJson('/api/director', ['prompt' => 'Create a reel', 'project' => $this->project()])->assertStatus(409);
    }

    public function test_director_rejects_non_loopback_provider(): void
    {
        Http::fake();
        Setting::create(['key' => 'studio', 'value' => ['provider' => 'ollama', 'providerModel' => 'test-model', 'providerUrl' => 'http://169.254.169.254:11434']]);
        $this->getJson('/api/director/status')->assertUnprocessable();
        Http::assertNothingSent();
    }

    public function test_director_returns_only_schema_validated_local_model_output(): void
    {
        Setting::create(['key' => 'studio', 'value' => ['provider' => 'ollama', 'providerModel' => 'test-model', 'providerUrl' => 'http://127.0.0.1:11434']]);
        $p = $this->project();
        $generated = $p;
        $generated['scenes'][0]['title'] = 'طراحی حرفه‌ای';
        Http::preventStrayRequests();
        Http::fake(['127.0.0.1:8001/worker/validate' => fn ($r) => Http::response(['project' => $r->data()]), '127.0.0.1:8001/worker/schema' => Http::response(['type' => 'object']), '127.0.0.1:11434/api/chat' => Http::response(['message' => ['content' => json_encode($generated)]])]);
        $this->postJson('/api/director', ['prompt' => 'Make an editable Persian title', 'project' => $p])->assertOk()->assertJsonPath('project.scenes.0.title', 'طراحی حرفه‌ای')->assertJsonPath('provider', 'ollama');
        $this->assertDatabaseCount('projects', 0);
        $this->assertDatabaseCount('activities', 1);
    }

    public function test_compressed_glb_decoders_and_truncated_containers_are_rejected(): void
    {
        $json = json_encode(['asset' => ['version' => '2.0'], 'extensionsRequired' => ['KHR_draco_mesh_compression']]);
        $json = str_pad($json, (int) ceil(strlen($json) / 4) * 4, ' ');
        $glb = 'glTF'.pack('V', 2).pack('V', 20 + strlen($json)).pack('V', strlen($json)).'JSON'.$json;
        $this->post('/api/assets', ['file' => UploadedFile::fake()->createWithContent('compressed.glb', $glb)], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->post('/api/assets', ['file' => UploadedFile::fake()->createWithContent('truncated.glb', 'glTF'.pack('V', 2).pack('V', 12))], ['Accept' => 'application/json'])->assertUnprocessable();
    }

    public function test_portable_restore_remaps_uploaded_font_family_references(): void
    {
        Storage::fake('local');
        $this->validator();
        $font = $this->post('/api/assets', ['file' => UploadedFile::fake()->createWithContent('Vazirmatn.woff2', file_get_contents(base_path('../../public/fonts/Vazirmatn.woff2')))], ['Accept' => 'application/json'])->assertCreated()->json();
        $p = $this->project([$font]);
        $p['scenes'][0]['layers'][0]['type'] = 'text';
        $p['scenes'][0]['layers'][0]['text'] = 'فارسی';
        $p['scenes'][0]['layers'][0]['fontFamily'] = 'asset:'.$font['id'];
        unset($p['scenes'][0]['layers'][0]['assetId']);
        $this->postJson('/api/projects', $p)->assertCreated();
        $response = $this->get('/api/projects/portable-project/backup')->assertOk();
        $path = $response->baseResponse->getFile()->getPathname();
        $restored = $this->post('/api/projects/import-backup', ['file' => UploadedFile::fake()->createWithContent('backup.zip', file_get_contents($path))], ['Accept' => 'application/json'])->assertCreated()->json();
        $this->assertNotSame($font['id'], $restored['assets'][0]['id']);
        $this->assertSame('asset:'.$restored['assets'][0]['id'], $restored['scenes'][0]['layers'][0]['fontFamily']);
        unlink($path);
    }
}
