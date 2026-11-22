<?php

namespace App\Services;

use App\Models\Asset;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AssetService
{
    public function upload(UploadedFile $file): array
    {
        abort_unless($file->isValid(), 422, 'Upload is incomplete.');
        abort_if($file->getSize() > config('nova.upload_limit'), 413, 'Assets must be at most 100 MB.');
        $head = file_get_contents($file->getRealPath(), false, null, 0, 32);
        $signature = $this->classify($head, (string) $file->getMimeType());
        if (! $signature) {
            throw ValidationException::withMessages(['file' => ['Unsupported or invalid file signature. Supported: PNG, JPEG, WebP, GIF, MP4, WebM, WAV, MP3, OGG, FLAC, WOFF2, GLB.']]);
        }
        [$type,$extension,$mime] = $signature;
        if ($type === 'image' && $extension !== 'svg') {
            $dimensions = @getimagesize($file->getRealPath());
            if (! $dimensions || $dimensions[0] > 16384 || $dimensions[1] > 16384 || $dimensions[0] * $dimensions[1] > 67108864) {
                throw ValidationException::withMessages(['file' => ['Invalid image or dimensions exceed the 64 megapixel limit.']]);
            }
        }
        if ($extension === 'glb') {
            $this->validateGlb($file);
        }
        if ($extension === 'svg') {
            $this->validateSvg($file);
        }
        $id = (string) Str::uuid();
        $name = mb_substr(preg_replace('/[\x00-\x1F\x7F\/\\\\]/u', '_', basename($file->getClientOriginalName())), 0, 240);
        $path = 'assets/'.$id.'.'.$extension;
        $stored = Storage::disk('local')->putFileAs('assets', $file, $id.'.'.$extension);
        abort_unless($stored, 500, 'The asset could not be written to local storage.');
        $data = ['id' => $id, 'name' => $name, 'type' => $type, 'path' => '/storage/'.$path, 'mime' => $mime, 'size' => $file->getSize(), 'tags' => [], 'folder' => 'Library', 'createdAt' => now()->toIso8601String()];
        try {
            Asset::create(['id' => $id, 'name' => $name, 'type' => $type, 'data' => $data]);
        } catch (\Throwable $exception) {
            Storage::disk('local')->delete($path);
            throw $exception;
        }

        return $data;
    }

    private function validateGlb(UploadedFile $file): void
    {
        $handle = fopen($file->getRealPath(), 'rb');
        $header = fread($handle, 20);
        fclose($handle);
        if (strlen($header) < 20) {
            throw ValidationException::withMessages(['file' => ['Invalid GLB header.']]);
        }
        $length = unpack('V', substr($header, 8, 4))[1] ?? 0;
        $jsonLength = unpack('V', substr($header, 12, 4))[1] ?? 0;
        $chunkType = substr($header, 16, 4);
        $valid = $length === $file->getSize() && $jsonLength > 0 && $jsonLength < 16777216 && $chunkType === 'JSON' && $jsonLength + 20 <= $length;
        if (! $valid) {
            throw ValidationException::withMessages(['file' => ['Invalid GLB container.']]);
        }
        try {
            $json = json_decode(file_get_contents($file->getRealPath(), false, null, 20, $jsonLength), true, 128, JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            throw ValidationException::withMessages(['file' => ['Invalid GLB JSON chunk.']]);
        }
        if (! is_array($json) || ($json['asset']['version'] ?? null) !== '2.0' || ! is_array($json['extensionsRequired'] ?? []) || array_filter($json['extensionsRequired'] ?? [], fn ($extension) => ! is_string($extension))) {
            throw ValidationException::withMessages(['file' => ['Invalid GLB asset metadata.']]);
        }
        if (array_intersect($json['extensionsRequired'] ?? [], ['KHR_draco_mesh_compression', 'EXT_meshopt_compression'])) {
            throw ValidationException::withMessages(['file' => ['Import an uncompressed GLB. Network-loaded Draco and meshopt decoders are disabled.']]);
        }
        $check = function (mixed $node) use (&$check): void {
            if (! is_array($node)) {
                return;
            }
            foreach ($node as $key => $value) {
                if ($key === 'uri' && (! is_string($value) || ! str_starts_with($value, 'data:'))) {
                    throw ValidationException::withMessages(['file' => ['GLB assets must be self-contained. External file and network references are blocked.']]);
                }
                if (is_array($value)) {
                    $check($value);
                }
            }
        };
        $check($json);
    }

    private function validateSvg(UploadedFile $file): void
    {
        $source = file_get_contents($file->getRealPath());
        if (preg_match('/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i', $source)) {
            throw ValidationException::withMessages(['file' => ['SVG document types, entities, and external stylesheets are blocked.']]);
        }
        $xml = new \DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $loaded = $xml->loadXML($source, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);
        if (! $loaded || $xml->documentElement?->localName !== 'svg') {
            throw ValidationException::withMessages(['file' => ['Invalid SVG image.']]);
        }
        foreach ($xml->getElementsByTagName('*') as $element) {
            if (in_array(strtolower($element->localName), ['script', 'foreignobject', 'iframe', 'object', 'embed', 'style', 'image', 'use', 'animate', 'animatemotion', 'animatetransform', 'set', 'a', 'audio', 'video'], true)) {
                throw ValidationException::withMessages(['file' => ['SVG executable elements and embedded references are blocked.']]);
            }
            foreach ($element->attributes as $attribute) {
                if (preg_match('/^on/i', $attribute->localName) || in_array(strtolower($attribute->localName), ['href', 'src'], true) || preg_match('/url\s*\(|javascript:|expression\s*\(/i', $attribute->value)) {
                    throw ValidationException::withMessages(['file' => ['SVG event handlers and external references are blocked.']]);
                }
            }
        }
    }

    public function classify(string $head, string $mime): ?array
    {
        if (str_starts_with($head, "\x89PNG\r\n\x1a\n")) {
            return ['image', 'png', 'image/png'];
        }
        if (str_starts_with($head, "\xff\xd8\xff")) {
            return ['image', 'jpg', 'image/jpeg'];
        }
        if (str_starts_with($head, 'GIF87a') || str_starts_with($head, 'GIF89a')) {
            return ['image', 'gif', 'image/gif'];
        }
        if (str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP') {
            return ['image', 'webp', 'image/webp'];
        }
        if (str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WAVE') {
            return ['audio', 'wav', 'audio/wav'];
        }
        if (str_starts_with($head, 'fLaC')) {
            return ['audio', 'flac', 'audio/flac'];
        }
        if (str_starts_with($head, 'OggS')) {
            return ['audio', 'ogg', 'audio/ogg'];
        }
        if (str_starts_with($head, 'ID3') || (strlen($head) > 1 && ord($head[0]) === 255 && (ord($head[1]) & 224) === 224)) {
            return ['audio', 'mp3', 'audio/mpeg'];
        }
        if (strlen($head) >= 12 && substr($head, 4, 4) === 'ftyp') {
            return ['video', 'mp4', 'video/mp4'];
        }
        if (str_starts_with($head, "\x1a\x45\xdf\xa3") && in_array($mime, ['video/webm', 'video/x-matroska', 'application/octet-stream'], true)) {
            return ['video', 'webm', 'video/webm'];
        }
        if ($mime === 'image/svg+xml') {
            return ['image', 'svg', 'image/svg+xml'];
        }
        if (str_starts_with($head, 'wOF2')) {
            return ['font', 'woff2', 'font/woff2'];
        }
        if (str_starts_with($head, 'glTF') && strlen($head) >= 12 && unpack('V', substr($head, 4, 4))[1] === 2) {
            return ['model', 'glb', 'model/gltf-binary'];
        }

        return null;
    }
}
