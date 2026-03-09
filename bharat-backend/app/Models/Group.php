<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Group extends Model
{
    use HasFactory;

    // This array allows the Controller to insert data into these columns
    protected $fillable = [
        'name', 
        'monthly_contribution', 
        'invite_code', 
        'created_by'
    ];

    // Your existing function (kept safe so other screens don't break!)
    public function users()
    {
        return $this->belongsToMany(User::class, 'group_user')
                    ->withPivot('role', 'status')
                    ->withTimestamps();
    }

    // NEW: The exact function the Add Member Controller is looking for!
    public function members()
    {
        return $this->belongsToMany(User::class, 'group_user')
                    ->withPivot('role', 'status')
                    ->withTimestamps();
    }

    // A group has many loans issued
    public function loans()
    {
        return $this->hasMany(Loan::class);
    }
}