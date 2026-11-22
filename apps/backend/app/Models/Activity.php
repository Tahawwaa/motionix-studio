<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Activity extends Model
{
    use HasFactory;

    protected $table = 'activities';

    protected $guarded = [];

    public $incrementing = true;

    protected $keyType = 'int';

    protected $primaryKey = 'id';

    protected function casts(): array
    {
        return ['details' => 'array'];
    }
}
