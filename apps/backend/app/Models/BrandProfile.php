<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BrandProfile extends Model
{
    use HasFactory;

    protected $table = 'brand_profiles';

    protected $guarded = [];

    public $incrementing = false;

    protected $keyType = 'string';

    protected $primaryKey = 'id';

    protected function casts(): array
    {
        return ['data' => 'array'];
    }
}
