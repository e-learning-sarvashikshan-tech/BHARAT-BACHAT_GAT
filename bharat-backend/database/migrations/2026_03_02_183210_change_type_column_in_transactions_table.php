<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Converts the strict column into a flexible string
            $table->string('type')->change();
        });
    }

    public function down()
    {
        Schema::table('transactions', function (Blueprint $table) {
            // We can leave this empty or revert to the old strict rule if needed
        });
    }
};