<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('group_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('group_id')->constrained()->onDelete('cascade');
            $table->string('role')->default('member'); // 'admin', 'co-admin', 'member'
            $table->string('status')->default('pending'); // 'pending', 'approved', 'rejected'
            $table->timestamps();

            // Prevent a user from joining the exact same group twice
            $table->unique(['user_id', 'group_id']); 
        });
    }

    public function down()
    {
        Schema::dropIfExists('group_user');
    }
};