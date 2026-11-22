<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StudioApiTest extends TestCase
{
    use RefreshDatabase;

    private function sample(): array
    {
        return ['schemaVersion' => 1, 'id' => 'test-project', 'name' => 'Persian demo', 'description' => '', 'width' => 1080, 'height' => 1920, 'fps' => 30, 'scenes' => [['id' => 'scene-1', 'name' => 'Opening', 'type' => 'typography', 'startFrame' => 0, 'duration' => 90, 'background' => '#09090B', 'accent' => '#2563EB', 'title' => 'طراحی وب‌سایت حرفه‌ای', 'subtitle' => 'NOVA استودیو', 'eyebrow' => 'NOVA', 'layers' => [], 'transition' => 'fade', 'transitionDuration' => 18, 'effects' => [], 'camera' => ['projection' => 'perspective', 'path' => 'static', 'intensity' => 0.6, 'fov' => 42]]], 'tracks' => [['id' => 'scenes', 'name' => 'Scenes', 'type' => 'scene', 'locked' => false, 'hidden' => false, 'muted' => false, 'solo' => false]], 'assets' => [], 'brand' => ['name' => 'NOVA', 'primary' => '#2563EB', 'secondary' => '#06B6D4', 'background' => '#09090B', 'font' => 'Vazirmatn', 'cta' => 'شروع کنیم'], 'archived' => false, 'createdAt' => '2026-11-21T00:00:00Z', 'updatedAt' => '2026-11-21T00:00:00Z'];
    }

    private function validator(): void
    {
        Http::preventStrayRequests();
        Http::fake(['127.0.0.1:8001/worker/validate' => fn ($r) => Http::response(['valid' => true, 'project' => $r->data(), 'warnings' => []])]);
    }

    public function test_projects_persist_and_revisions_restore_editable_persian_text(): void
    {
        $this->validator();
        $p = $this->sample();
        $this->postJson('/api/projects', $p)->assertCreated()->assertJsonPath('scenes.0.title', 'طراحی وب‌سایت حرفه‌ای');
        $this->getJson('/api/projects')->assertOk()->assertJsonCount(1)->assertJsonPath('0.id', 'test-project');
        $p['name'] = 'Revised';
        $this->putJson('/api/projects/test-project', $p)->assertOk()->assertJsonPath('name', 'Revised');
        $this->getJson('/api/projects/test-project/versions')->assertOk()->assertJsonCount(2)->assertJsonPath('0.version', 2);
        $this->postJson('/api/projects/test-project/versions/1/restore')->assertOk()->assertJsonPath('name', 'Persian demo');
        $this->assertDatabaseCount('project_revisions', 3);
    }

    public function test_invalid_canonical_project_is_rejected_without_persistence(): void
    {
        Http::fake(['*' => Http::response(['error' => 'Unknown track reference'], 422)]);
        $this->postJson('/api/projects', $this->sample())->assertUnprocessable()->assertJsonValidationErrors('project');
        $this->assertDatabaseCount('projects', 0);
    }

    public function test_worker_unavailability_does_not_save_unvalidated_json(): void
    {
        Http::fake(['*' => Http::failedConnection()]);
        $this->postJson('/api/projects', $this->sample())->assertStatus(503);
        $this->assertDatabaseCount('projects', 0);
    }

    public function test_deletion_requires_confirmation_and_cascades_revisions(): void
    {
        $this->validator();
        $this->postJson('/api/projects', $this->sample())->assertCreated();
        $this->deleteJson('/api/projects/test-project')->assertUnprocessable();
        $this->deleteJson('/api/projects/test-project', ['confirm' => true])->assertOk();
        $this->assertDatabaseCount('projects', 0);
        $this->assertDatabaseCount('project_revisions', 0);
    }

    public function test_project_id_cannot_change_during_update(): void
    {
        $this->validator();
        $this->postJson('/api/projects', $this->sample());
        $p = $this->sample();
        $p['id'] = 'other-project';
        $this->putJson('/api/projects/test-project', $p)->assertUnprocessable();
    }

    public function test_upload_and_secure_serving_use_generated_filename(): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->image('original.png', 32, 32);
        $response = $this->post('/api/assets', ['file' => $file], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('type', 'image');
        $asset = $response->json();
        $this->assertNotSame('original.png', basename($asset['path']));
        $this->get($asset['path'])->assertOk()->assertHeader('Content-Type', 'image/png');
        $this->assertContains($this->get('/storage/assets/../../.env')->getStatusCode(), [403, 404]);
    }

    public function test_executable_upload_disguised_as_png_is_rejected(): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->createWithContent('portrait.png', '<?php echo "bad";');
        $this->post('/api/assets', ['file' => $file], ['Accept' => 'application/json'])->assertUnprocessable();
        $this->assertDatabaseCount('assets', 0);
    }

    public function test_cross_origin_and_dns_rebinding_requests_are_blocked(): void
    {
        $this->withHeader('Origin', 'https://attacker.example')->getJson('/api/projects')->assertForbidden();
        $this->withHeader('Origin', 'http://localhost:5173')->getJson('http://attacker.example/api/projects')->assertForbidden();
    }

    public function test_non_loopback_request_is_blocked_even_with_forwarded_header(): void
    {
        $this->withServerVariables(['REMOTE_ADDR' => '192.168.1.2'])->withHeader('X-Forwarded-For', '127.0.0.1')->getJson('/api/projects')->assertForbidden();
    }

    public function test_optional_api_token_is_verified_and_never_logged(): void
    {
        config(['nova.api_token' => 'private-test-token']);
        $this->getJson('/api/projects')->assertUnauthorized();
        $this->withToken('wrong')->getJson('/api/projects')->assertUnauthorized();
        $this->withToken('private-test-token')->getJson('/api/projects')->assertOk();
    }

    public function test_settings_limits_and_brand_profiles_round_trip(): void
    {
        $this->putJson('/api/settings', ['concurrency' => 40])->assertUnprocessable();
        $this->putJson('/api/settings', ['concurrency' => 3, 'language' => 'fa'])->assertOk()->assertJsonPath('concurrency', 3);
        $this->getJson('/api/settings')->assertOk()->assertJsonPath('language', 'fa');
        $this->postJson('/api/brands', $this->sample()['brand'])->assertCreated()->assertJsonPath('font', 'Vazirmatn');
        $this->getJson('/api/brands')->assertOk()->assertJsonCount(1);
    }

    public function test_audit_secrets_are_redacted_recursively(): void
    {
        $this->postJson('/api/activity', ['action' => 'agent.operation', 'details' => ['apiToken' => 'private-test', 'nested' => ['password' => 'hidden'], 'tool' => 'create_scene']])->assertCreated()->assertJsonPath('details.apiToken', '[redacted]')->assertJsonPath('details.nested.password', '[redacted]');
        $this->getJson('/api/activity')->assertOk()->assertJsonPath('0.details.tool', 'create_scene');
    }

    public function test_canonical_empty_strings_and_typographic_whitespace_reach_validator_unchanged(): void
    {
        $this->validator();
        $project = $this->sample();
        $project['description'] = '';
        $project['scenes'][0]['subtitle'] = '  Mixed فارسی / English  ';
        $this->postJson('/api/projects', $project)->assertCreated()->assertJsonPath('description', '')->assertJsonPath('scenes.0.subtitle', '  Mixed فارسی / English  ');
        Http::assertSent(fn ($request) => $request['description'] === '' && $request['scenes'][0]['subtitle'] === '  Mixed فارسی / English  ');
    }

    public function test_remotion_media_allows_temporary_loopback_origin_but_api_does_not(): void
    {
        Storage::fake('local');
        $asset = $this->post('/api/assets', ['file' => UploadedFile::fake()->image('screen.png', 20, 20)], ['Accept' => 'application/json'])->assertCreated()->json();
        $this->withHeaders(['Origin' => 'http://localhost:43218', 'Sec-Fetch-Site' => 'cross-site'])->get($asset['path'])->assertOk()->assertHeader('Access-Control-Allow-Origin', 'http://localhost:43218');
        $this->getJson('/api/projects')->assertForbidden();
        $this->withHeaders(['Origin' => 'https://attacker.example', 'Sec-Fetch-Site' => 'cross-site'])->get($asset['path'])->assertForbidden();
    }

    public function test_brand_colors_follow_canonical_hex_lengths_and_empty_cta_is_valid(): void
    {
        $brand = $this->sample()['brand'];
        $brand['primary'] = '#12345';
        $this->postJson('/api/brands', $brand)->assertUnprocessable()->assertJsonValidationErrors('primary');
        $brand['primary'] = '#1234567';
        $this->postJson('/api/brands', $brand)->assertUnprocessable()->assertJsonValidationErrors('primary');
        $brand['primary'] = '#1234';
        $brand['cta'] = '';
        $this->postJson('/api/brands', $brand)->assertCreated()->assertJsonPath('cta', '');
    }
}
