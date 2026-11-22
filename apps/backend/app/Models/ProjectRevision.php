<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectRevision extends Model
{
    use HasFactory;

    protected $table = 'project_revisions';

    protected $guarded = [];

    public $incrementing = true;

    protected $keyType = 'int';

    protected $primaryKey = 'id';

    protected function casts(): array
    {
        return ['data' => 'array'];
    }
}
