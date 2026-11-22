<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Project;
use App\Models\ProjectRevision;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class ProjectService
{
    public function validate(array $input): array
    {
        abort_if(strlen(json_encode($input, JSON_THROW_ON_ERROR)) > 8 * 1024 * 1024, 413, 'Project JSON exceeds 8 MB.');
        try {
            $http = Http::connectTimeout(2)->timeout(12)->acceptJson();
            if (config('nova.api_token')) {
                $http->withToken(config('nova.api_token'));
            }
            $response = $http->post(config('nova.worker_url').'/worker/validate', $input);
        } catch (ConnectionException $exception) {
            abort(503, 'The render worker must be running to validate the canonical project schema.');
        }
        if ($response->status() === 422 || $response->status() === 400) {
            throw ValidationException::withMessages(['project' => [$response->json('error') ?: $response->json('message') ?: 'Project failed canonical schema validation.']]);
        }
        abort_unless($response->successful(), 503, 'Project validator is unavailable.');
        $project = $response->json('project') ?? $response->json();
        abort_unless(is_array($project) && isset($project['id'],$project['schemaVersion'],$project['name'],$project['scenes']), 503, 'Unexpected schema validator response.');

        return $project;
    }

    public function save(array $input, ?Project $existing = null): array
    {
        $data = $this->validate($input);
        if ($existing) {
            abort_unless($data['id'] === $existing->id, 422, 'Project ID cannot change.');
        }

        return DB::transaction(function () use ($data, $existing): array {
            $project = $existing ?? new Project(['id' => $data['id']]);
            if (! $existing) {
                abort_if(Project::whereKey($data['id'])->exists(), 409, 'Project already exists.');
            }
            $data['updatedAt'] = now()->toIso8601String();
            if ($existing) {
                $data['createdAt'] = $existing->data['createdAt'];
            }
            $project->fill(['name' => $data['name'], 'archived' => $data['archived'] ?? false, 'data' => $data])->save();
            $version = (int) ProjectRevision::where('project_id', $project->id)->max('version') + 1;
            ProjectRevision::create(['project_id' => $project->id, 'version' => $version, 'data' => $data]);
            Activity::create(['action' => $existing ? 'project.updated' : 'project.created', 'subject' => $project->id, 'details' => ['version' => $version]]);

            return $data;
        });
    }

    public function restore(Project $project, int $version): array
    {
        $revision = ProjectRevision::where('project_id', $project->id)->where('version', $version)->firstOrFail();

        return $this->save($revision->data, $project);
    }
}
