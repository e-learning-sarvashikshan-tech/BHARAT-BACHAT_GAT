<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    // This array allows the Controller to insert data into these columns
    protected $fillable = [
        'group_id',
        'user_id',
        'type',
        'amount',
        'method',
        'category',
        'transaction_date'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    public function group()
    {
        return $this->belongsTo(Group::class);
    }
}