<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveProjectRequest;
use App\Http\Requests\UploadAssetRequest;
use App\Http\Resources\AssetResource;
use App\Http\Resources\ProjectResource;
use App\Models\Activity;
use App\Models\Asset;
use App\Models\BrandProfile;
use App\Models\Project;
use App\Models\ProjectRevision;
use App\Models\Setting;
use App\Services\AssetService;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class StudioController extends Controller
{
    public function __construct(private ProjectService $projectService, private AssetService $assetService) {}

    public function health(): JsonResponse
    {
        return response()->json(['status' => 'healthy', 'database' => DB::connection()->getDriverName(), 'version' => '0.1.0']);
    }

    public function projects(): JsonResponse
    {
        Gate::authorize('viewAny', Project::class);

        return response()->json(ProjectResource::collection(Project::orderByDesc('updated_at')->get())->resolve());
    }

    public function project(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json((new ProjectResource($project))->resolve());
    }

    public function createProject(SaveProjectRequest $request): JsonResponse
    {
        Gate::authorize('create', Project::class);

        return response()->json((new ProjectResource($this->projectService->save($request->all())))->resolve(), 201);
    }

    public function updateProject(SaveProjectRequest $request, Project $project): JsonResponse
    {
        Gate::authorize('update', $project);

        return response()->json((new ProjectResource($this->projectService->save($request->all(), $project)))->resolve());
    }

    public function deleteProject(Request $request, Project $project): JsonResponse
    {
        Gate::authorize('delete', $project);
        abort_unless($request->boolean('confirm'), 422, 'Explicit confirmation is required to permanently delete a project.');
        DB::transaction(function () use ($project): void {
            $id = $project->id;
            $project->delete();
            Activity::create(['action' => 'project.deleted', 'subject' => $id]);
        });

        return response()->json(['deleted' => true]);
    }

    public function versions(Project $project): JsonResponse
    {
        return response()->json(ProjectRevision::where('project_id', $project->id)->orderByDesc('version')->get()->map(fn ($v) => ['id' => $v->id, 'version' => $v->version, 'name' => $v->data['name'], 'createdAt' => $v->created_at->toIso8601String()]));
    }

    public function version(Project $project, int $version): JsonResponse
    {
        return response()->json(ProjectRevision::where('project_id', $project->id)->where('version', $version)->firstOrFail()->data);
    }

    public function restore(Project $project, int $version): JsonResponse
    {
        return response()->json($this->projectService->restore($project, $version));
    }

    public function assets(): JsonResponse
    {
        return response()->json(AssetResource::collection(Asset::orderByDesc('created_at')->get())->resolve());
    }

    public function asset(Asset $asset): JsonResponse
    {
        return response()->json((new AssetResource($asset))->resolve());
    }

    public function upload(UploadAssetRequest $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'max:102400']]);
        $data = $this->assetService->upload($request->file('file'));
        Activity::create(['action' => 'asset.uploaded', 'subject' => $data['id'], 'details' => ['type' => $data['type'], 'size' => $data['size']]]);

        return response()->json($data, 201);
    }

    public function updateAsset(Request $request, Asset $asset): JsonResponse
    {
        $changes = $request->validate(['tags' => ['sometimes', 'array', 'max:30'], 'tags.*' => ['string', 'max:100'], 'folder' => ['sometimes', 'string', 'max:100'], 'name' => ['sometimes', 'string', 'min:1', 'max:240']]);
        $data = array_merge($asset->data, $changes);
        $asset->update(['data' => $data, 'name' => $data['name']]);

        return response()->json($data);
    }

    public function deleteAsset(Request $request, Asset $asset): JsonResponse
    {
        abort_unless($request->boolean('confirm'), 422, 'Explicit confirmation is required to permanently delete an asset.');
        foreach (Project::cursor() as $project) {
            foreach ($project->data['assets'] ?? [] as $reference) {
                abort_if($reference['id'] === $asset->id, 409, 'This asset is referenced by a project. Remove that reference first.');
            }
        }
        Storage::disk('local')->delete('assets/'.basename($asset->data['path']));
        $id = $asset->id;
        $asset->delete();
        Activity::create(['action' => 'asset.deleted', 'subject' => $id]);

        return response()->json(['deleted' => true]);
    }

    public function serveAsset(string $filename): BinaryFileResponse
    {
        $asset = Asset::where('id', pathinfo($filename, PATHINFO_FILENAME))->firstOrFail();
        abort_unless(basename($asset->data['path']) === $filename, 404);
        $path = Storage::disk('local')->path('assets/'.$filename);
        abort_unless(is_file($path), 404);

        return response()->file($path, ['Content-Type' => $asset->data['mime'], 'Cache-Control' => 'private, max-age=86400', 'Content-Security-Policy' => "default-src 'none'; sandbox", 'X-Content-Type-Options' => 'nosniff']);
    }

    public function settings(): JsonResponse
    {
        return response()->json(Setting::find('studio')?->value ?? $this->defaultSettings());
    }

    public function defaultSettings(): array
    {
        return ['concurrency' => 2, 'maxConcurrentRenders' => 1, 'memoryLimitMb' => 4096, 'defaultWidth' => 1080, 'defaultHeight' => 1920, 'defaultFps' => 30, 'quality' => 'draft', 'language' => 'en', 'safeZones' => true, 'provider' => 'none', 'providerModel' => '', 'providerUrl' => 'http://127.0.0.1:11434', 'storageLocation' => 'apps/backend/storage/app/private', 'cacheLimitMb' => 2048];
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $changes = $request->validate(['concurrency' => ['sometimes', 'integer', 'min:1', 'max:4'], 'maxConcurrentRenders' => ['sometimes', 'integer', 'in:1'], 'memoryLimitMb' => ['sometimes', 'integer', 'min:512', 'max:16384'], 'defaultWidth' => ['sometimes', 'integer', 'min:256', 'max:3840'], 'defaultHeight' => ['sometimes', 'integer', 'min:256', 'max:3840'], 'defaultFps' => ['sometimes', 'integer', 'in:24,25,30,60'], 'quality' => ['sometimes', 'in:draft,balanced,social,high'], 'language' => ['sometimes', 'in:en,fa'], 'safeZones' => ['sometimes', 'boolean'], 'provider' => ['sometimes', 'in:none,ollama,openai-compatible'], 'providerModel' => ['sometimes', 'nullable', 'string', 'max:200'], 'providerUrl' => ['sometimes', 'url:http,https', 'max:300'], 'cacheLimitMb' => ['sometimes', 'integer', 'min:128', 'max:32768']]);
        $settings = array_merge($this->defaultSettings(), Setting::find('studio')?->value ?? [], $changes);
        Setting::updateOrCreate(['key' => 'studio'], ['value' => $settings]);

        return response()->json($settings);
    }

    public function brands(): JsonResponse
    {
        return response()->json(BrandProfile::orderBy('created_at')->get()->map(fn ($b) => ['id' => $b->id, ...$b->data]));
    }

    private function brandData(Request $request): array
    {
        return $request->validate(['name' => ['required', 'string', 'max:200'], 'primary' => ['required', 'regex:/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/'], 'secondary' => ['required', 'regex:/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/'], 'background' => ['required', 'regex:/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/'], 'font' => ['required', 'in:Inter,Vazirmatn,Georgia,monospace'], 'cta' => ['present', 'string', 'max:500']]);
    }

    public function createBrand(Request $request): JsonResponse
    {
        $data = $this->brandData($request);
        $brand = BrandProfile::create(['id' => (string) Str::uuid(), 'data' => $data]);

        return response()->json(['id' => $brand->id, ...$data], 201);
    }

    public function updateBrand(Request $request, string $brand): JsonResponse
    {
        $model = BrandProfile::findOrFail($brand);
        $data = $this->brandData($request);
        $model->update(['data' => $data]);

        return response()->json(['id' => $model->id, ...$data]);
    }

    public function activity(): JsonResponse
    {
        return response()->json(Activity::orderByDesc('id')->limit(200)->get()->map(fn ($a) => ['id' => $a->id, 'action' => $a->action, 'subject' => $a->subject, 'details' => $a->details, 'createdAt' => $a->created_at->toIso8601String()]));
    }

    public function logActivity(Request $request): JsonResponse
    {
        $data = $request->validate(['action' => ['required', 'string', 'max:120'], 'subject' => ['nullable', 'string', 'max:200'], 'details' => ['nullable', 'array']]);
        $data['details'] = $this->redact($data['details'] ?? []);
        abort_if(strlen(json_encode($data['details'])) > 8192, 422, 'Audit details are too large.');
        $activity = Activity::create($data);

        return response()->json(['id' => $activity->id, ...$data, 'createdAt' => $activity->created_at->toIso8601String()], 201);
    }

    private function redact(array $data): array
    {
        foreach ($data as $key => $value) {
            if (preg_match('/token|secret|password|authorization|api.?key/i', (string) $key)) {
                $data[$key] = '[redacted]';
            } elseif (is_array($value)) {
                $data[$key] = $this->redact($value);
            }
        }

        return $data;
    }

    public function templates(): JsonResponse
    {
        return response()->json(DB::table('saved_templates')->orderByDesc('created_at')->get()->map(fn ($t) => ['id' => $t->id, 'name' => $t->name, 'project' => json_decode($t->data, true), 'createdAt' => $t->created_at]));
    }

    public function saveTemplate(Request $request): JsonResponse
    {
        $data = $this->projectService->validate($request->input('project', $request->all()));
        $id = (string) Str::uuid();
        DB::table('saved_templates')->insert(['id' => $id, 'name' => $data['name'], 'data' => json_encode($data, JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);

        return response()->json(['id' => $id, 'name' => $data['name'], 'project' => $data], 201);
    }

    public function storage(): JsonResponse
    {
        $bytes = Asset::get()->sum(fn ($a) => $a->data['size']);

        return response()->json(['assetBytes' => $bytes, 'assetCount' => Asset::count(), 'projectCount' => Project::count(), 'freeBytes' => disk_free_space(storage_path('app/private'))]);
    }
}
