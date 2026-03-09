<?php

namespace App\Models;

// --- ADD THESE TWO LINES SO LARAVEL FINDS YOUR NEW TABLES ---
use App\Models\Group;
use App\Models\Transaction;
// ------------------------------------------------------------

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'otp',
    ];

    /**
     * The attributes that should be hidden for serialization.
     */
    protected $hidden = [
        'password',
        'remember_token',
        'otp', 
    ];

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    // --- RELATIONSHIPS ---

    public function groups()
    {
        return $this->belongsToMany(Group::class, 'group_user')
                    ->withPivot('role', 'status') // Fetch their role/status for this specific group
                    ->withTimestamps();
    }

    public function transactions()
    {
        return $this->hasMany(Transaction::class);
    }
}