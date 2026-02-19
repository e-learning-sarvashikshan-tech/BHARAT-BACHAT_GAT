<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class GroupMember extends Model
{
    protected $table = 'group_members'; // Explicitly define table name
    public $timestamps = false; // We only have joined_at, not updated_at
    protected $fillable = ['user_id', 'group_id', 'role'];
}