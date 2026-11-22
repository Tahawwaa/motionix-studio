<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

class ProjectPolicy
{
    private function localSession(): bool
    {
        return in_array(request()->server('REMOTE_ADDR', '127.0.0.1'), ['127.0.0.1', '::1'], true);
    }

    public function viewAny(?User $user): bool
    {
        return $this->localSession();
    }

    public function view(?User $user, Project $project): bool
    {
        return $this->localSession();
    }

    public function create(?User $user): bool
    {
        return $this->localSession();
    }

    public function update(?User $user, Project $project): bool
    {
        return $this->localSession();
    }

    public function delete(?User $user, Project $project): bool
    {
        return $this->localSession();
    }

    public function restore(?User $user, Project $project): bool
    {
        return $this->localSession();
    }

    public function forceDelete(?User $user, Project $project): bool
    {
        return false;
    }
}
