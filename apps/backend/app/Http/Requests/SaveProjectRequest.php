<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SaveProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['schemaVersion' => ['required', 'integer', 'in:1'], 'id' => ['required', 'string', 'max:100'], 'name' => ['required', 'string', 'min:1', 'max:200'], 'scenes' => ['required', 'array', 'min:1', 'max:100'], 'tracks' => ['required', 'array', 'min:1', 'max:30'], 'assets' => ['sometimes', 'array', 'max:500'], 'brand' => ['required', 'array']];
    }
}
