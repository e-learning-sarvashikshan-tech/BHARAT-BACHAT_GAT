<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
{
    Schema::create('groups', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('invite_code')->unique();
        $table->decimal('monthly_contribution', 10, 2)->default(500);
        $table->foreignId('created_by')->constrained('users');
        $table->timestamps();
    });

    Schema::table('users', function (Blueprint $table) {
        $table->foreignId('group_id')->nullable()->constrained('groups')->onDelete('set null');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('groups');
    }
};
