<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Setting;
use App\Services\ProjectService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class DirectorController extends Controller
{
    public function __construct(private ProjectService $projects) {}

    private function provider(): array
    {
        return array_merge(['provider' => 'none', 'providerModel' => '', 'providerUrl' => 'http://127.0.0.1:11434'], Setting::find('studio')?->value ?? []);
    }

    private function localUrl(array $settings): string
    {
        $parts = parse_url($settings['providerUrl']);
        abort_unless($parts && ($parts['scheme'] ?? '') === 'http' && in_array($parts['host'] ?? '', ['127.0.0.1', 'localhost'], true) && ($parts['port'] ?? 0) === 11434 && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['query']) && ! isset($parts['fragment']) && in_array($parts['path'] ?? '', ['', '/'], true), 422, 'The Ollama provider must use http://127.0.0.1:11434 or http://localhost:11434.');

        return 'http://'.$parts['host'].':11434';
    }

    private function http(int $timeout = 4): PendingRequest
    {
        return Http::connectTimeout(2)->timeout($timeout)->withOptions(['allow_redirects' => false, 'proxy' => '', 'progress' => function (float $total, float $downloaded): void {
            if ($total > 8388608 || $downloaded > 8388608) {
                throw new \RuntimeException('Provider response exceeds 8 MB.');
            }
        }])->acceptJson();
    }

    public function status(): JsonResponse
    {
        $settings = $this->provider();
        if ($settings['provider'] === 'none') {
            return response()->json(['provider' => 'none', 'state' => 'disconnected', 'models' => [], 'message' => 'Connect a local Ollama model in Settings, or use an external agent through MCP.']);
        }
        if ($settings['provider'] !== 'ollama') {
            return response()->json(['provider' => $settings['provider'], 'state' => 'unavailable', 'models' => [], 'message' => 'Built-in generation currently supports local Ollama only. Use MCP for other providers.']);
        }
        $url = $this->localUrl($settings);
        try {
            $response = $this->http()->get($url.'/api/tags');
            if (! $response->successful()) {
                throw new \RuntimeException('Provider is unavailable.');
            }$models = array_values(array_filter(array_map(fn ($m) => $m['name'] ?? null, $response->json('models') ?? [])));
            $connected = in_array($settings['providerModel'], $models, true);

            return response()->json(['provider' => 'ollama', 'state' => $connected ? 'connected' : 'disconnected', 'models' => $models, 'message' => $connected ? 'Local Ollama model is connected.' : 'Choose an installed local model in Settings.']);
        } catch (\Throwable) {
            return response()->json(['provider' => 'ollama', 'state' => 'unavailable', 'models' => [], 'message' => 'The local Ollama server could not be reached.']);
        }
    }

    public function generate(Request $request): JsonResponse
    {
        $input = $request->validate(['prompt' => ['required', 'string', 'min:3', 'max:10000'], 'project' => ['required', 'array']]);
        $settings = $this->provider();
        abort_unless($settings['provider'] === 'ollama', 409, 'No local AI provider is connected. Configure Ollama in Settings or use MCP.');
        abort_unless(is_string($settings['providerModel']) && strlen($settings['providerModel']) > 0, 409, 'Choose an installed Ollama model first.');
        $url = $this->localUrl($settings);
        $project = $this->projects->validate($input['project']);
        try {
            $schemaRequest = $this->http();
            if (config('nova.api_token')) {
                $schemaRequest->withToken(config('nova.api_token'));
            }
            $schemaResponse = $schemaRequest->get(config('nova.worker_url').'/worker/schema');
            abort_unless($schemaResponse->successful(), 503, 'The project schema is unavailable.');
            $schema = $schemaResponse->json();
            $response = $this->http(120)->post($url.'/api/chat', ['model' => $settings['providerModel'], 'stream' => false, 'format' => $schema, 'options' => ['temperature' => 0.2, 'num_predict' => 8192], 'messages' => [
                ['role' => 'system', 'content' => 'You are NOVA Motion Director. Return only a complete JSON project conforming to the provided schema. Edit the supplied project following the creative brief. Use integer frames. Retain its id, createdAt, dimensions and asset library. Never add external media, URLs, arbitrary code or filesystem paths. All layer assetId references must exist in the provided asset library. Preserve Persian glyph shaping; use editable text. Be cinematic, concise, and legible.'],
                ['role' => 'user', 'content' => json_encode(['creativeBrief' => $input['prompt'], 'project' => $project], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)],
            ]]);
            abort_unless($response->successful(), 502, 'The local model request failed. Confirm the model is installed in Ollama.');
            $content = $response->json('message.content');
            abort_unless(is_string($content) && strlen($content) <= 8388608, 502, 'The local model did not return a supported project response.');
            try {
                $candidate = json_decode($content, true, 128, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                abort(422, 'The local model returned invalid JSON. Nothing was applied.');
            }
            abort_unless(is_array($candidate), 422, 'The local model returned an invalid project.');
            $candidate['id'] = $project['id'];
            $candidate['createdAt'] = $project['createdAt'];
            $candidate['assets'] = $project['assets'];
            $validated = $this->projects->validate($candidate);
            $available = array_column($project['assets'], 'id');
            foreach ($validated['scenes'] as $scene) {
                foreach ($scene['layers'] ?? [] as $layer) {
                    abort_if(isset($layer['assetId']) && ! in_array($layer['assetId'], $available, true), 422, 'The generated project references an unavailable asset.');
                }
            }
            Activity::create(['action' => 'director.generated', 'subject' => $project['id'], 'details' => ['provider' => 'ollama', 'model' => $settings['providerModel']]]);

            return response()->json(['project' => $validated, 'provider' => 'ollama', 'message' => 'Generated locally. Review the project before rendering.']);
        } catch (ConnectionException) {
            abort(503, 'The local model could not be reached or timed out. Nothing was applied.');
        }
    }
}
