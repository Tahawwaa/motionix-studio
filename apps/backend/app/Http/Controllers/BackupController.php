<?php

namespace App\Http\Controllers;

use App\Models\Asset;
use App\Models\Project;
use App\Services\AssetService;
use App\Services\ProjectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

class BackupController extends Controller
{
    public function __construct(private ProjectService $projects, private AssetService $assets) {}

    public function download(Project $project): BinaryFileResponse
    {
        $directory = storage_path('app/private/backups');
        if (! is_dir($directory)) {
            mkdir($directory, 0700, true);
        }
        $path = $directory.'/'.Str::uuid().'.zip';
        $zip = new ZipArchive;
        abort_unless($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true, 500, 'Could not create backup.');
        try {
            $zip->addFromString('project.json', json_encode($project->data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
            foreach ($project->data['assets'] ?? [] as $reference) {
                $asset = Asset::find($reference['id']);
                abort_unless($asset && $asset->data['path'] === $reference['path'], 422, 'A project asset is missing from the local library.');
                $filename = basename($asset->data['path']);
                $source = Storage::disk('local')->path('assets/'.$filename);
                abort_unless(is_file($source), 422, 'An asset file is missing.');
                $zip->addFile($source, 'assets/'.$filename);
            }
            $zip->close();
        } catch (\Throwable $exception) {
            $zip->close();
            @unlink($path);
            throw $exception;
        }

        return response()->download($path, Str::slug($project->name).'-nova.zip', ['Content-Type' => 'application/zip'])->deleteFileAfterSend(true);
    }

    public function restore(Request $request): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'max:102400']]);
        $upload = $request->file('file');
        $zip = new ZipArchive;
        abort_unless($zip->open($upload->getRealPath()) === true, 422, 'Invalid backup ZIP archive.');
        $newPaths = [];
        $staged = [];
        try {
            abort_if($zip->numFiles > 501, 422, 'Backup has too many entries.');
            $total = 0;
            $names = [];
            for ($index = 0; $index < $zip->numFiles; $index++) {
                $entry = $zip->statIndex($index);
                $name = $entry['name'];
                abort_unless($name === 'project.json' || preg_match('/^assets\/[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/D', $name), 422, 'Unsafe archive entry path.');
                abort_if(isset($names[$name]), 422, 'Duplicate archive entries are not permitted.');
                $names[$name] = true;
                $total += $entry['size'];
                abort_if($entry['size'] > 104857600 || $total > 209715200, 422, 'Backup exceeds the uncompressed size limit.');
                $opsys = 0;
                $attributes = 0;
                $zip->getExternalAttributesIndex($index, $opsys, $attributes);
                abort_if((($attributes >> 16) & 0170000) === 0120000, 422, 'Archive symlinks are not permitted.');
            }
            abort_unless(isset($names['project.json']), 422, 'Backup must include project.json.');
            $manifest = $zip->statName('project.json');
            abort_if($manifest['size'] > 8388608, 422, 'Project JSON exceeds 8 MB.');
            try {
                $data = json_decode($zip->getFromName('project.json'), true, 128, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                abort(422, 'Invalid project.json.');
            }
            abort_unless(is_array($data), 422, 'Invalid project document.');
            $data = $this->projects->validate($data);
            $result = DB::transaction(function () use ($zip, $data, &$newPaths, &$staged): array {
                $map = [];
                $assets = [];
                foreach ($data['assets'] as $reference) {
                    $entry = 'assets/'.basename($reference['path']);
                    $metadata = $zip->statName($entry);
                    abort_unless($metadata, 422, 'A required asset is missing from the backup.');
                    $temp = tempnam(storage_path('app/private'), 'import-');
                    $staged[] = $temp;
                    file_put_contents($temp, $zip->getFromName($entry));
                    $asset = $this->assets->upload(new UploadedFile($temp, $reference['name'], null, null, true));
                    $asset['tags'] = $reference['tags'] ?? [];
                    $asset['folder'] = $reference['folder'] ?? 'Library';
                    Asset::findOrFail($asset['id'])->update(['data' => $asset]);
                    $map[$reference['id']] = $asset['id'];
                    $newPaths[] = 'assets/'.basename($asset['path']);
                    $assets[] = $asset;
                }
                $data['id'] = (string) Str::uuid();
                $data['name'] = mb_substr($data['name'].' (restored)', 0, 200);
                $data['createdAt'] = now()->toIso8601String();
                $data['updatedAt'] = $data['createdAt'];
                $data['assets'] = $assets;
                foreach ($data['scenes'] as &$scene) {
                    foreach ($scene['layers'] as &$layer) {
                        if (isset($layer['assetId'])) {
                            abort_unless(isset($map[$layer['assetId']]), 422, 'A layer references an asset missing from the manifest.');
                            $layer['assetId'] = $map[$layer['assetId']];
                        }
                        if (isset($layer['fontFamily']) && str_starts_with($layer['fontFamily'], 'asset:')) {
                            $fontId = substr($layer['fontFamily'], 6);
                            abort_unless(isset($map[$fontId]), 422, 'A text layer references a font missing from the manifest.');
                            $layer['fontFamily'] = 'asset:'.$map[$fontId];
                        }
                    }unset($layer);
                }unset($scene);

                return $this->projects->save($data);
            });

            return response()->json($result, 201);
        } catch (\Throwable $exception) {
            foreach ($newPaths as $path) {
                Storage::disk('local')->delete($path);
            }throw $exception;
        } finally {
            $zip->close();
            foreach ($staged as $path) {
                @unlink($path);
            }
        }
    }
}
