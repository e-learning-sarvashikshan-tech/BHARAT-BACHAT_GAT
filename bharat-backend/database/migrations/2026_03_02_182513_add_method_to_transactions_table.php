<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Adds the 'method' column (to store UPI, Cash, etc.) right after 'type'
            $table->string('method')->nullable()->after('type');
        });
    }

    public function down()
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Reverses the action if we ever need to rollback
            $table->dropColumn('method');
        });
    }
};