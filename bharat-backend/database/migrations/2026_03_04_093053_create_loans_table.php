<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('loans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->foreignId('group_id')->constrained()->onDelete('cascade');
            
            $table->decimal('principal_amount', 10, 2);
            $table->decimal('interest_rate', 5, 2); // Copied from group settings at time of request
            $table->integer('duration_months');
            
            // Status tracks the lifecycle of the loan
            $table->enum('status', ['pending', 'approved', 'rejected', 'active', 'completed'])->default('pending');
            
            // Tracks which Admin approved the loan
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('loans');
    }
};