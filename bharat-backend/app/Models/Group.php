<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    use HasFactory;

    // This array allows the Controller to insert data into these columns
    protected $fillable = [
        'user_id',
        'type',
        'amount',
        'method',
        'transaction_date'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}