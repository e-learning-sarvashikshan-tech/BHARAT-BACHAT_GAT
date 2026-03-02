<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GroupMember extends Model
{
    use HasFactory;

    protected $fillable = ['group_id', 'user_id', 'role', 'joined_at'];

    // Links back to the User table
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Links back to the Group table
    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}