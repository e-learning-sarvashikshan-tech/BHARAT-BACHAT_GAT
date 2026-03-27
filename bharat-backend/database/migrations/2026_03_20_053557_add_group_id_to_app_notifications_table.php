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
    Schema::table('app_notifications', function (Blueprint $table) {
        // Add group_id, nullable in case we have global system notifications later
        $table->unsignedBigInteger('group_id')->nullable()->after('user_id');
    });
}

public function down()
{
    Schema::table('app_notifications', function (Blueprint $table) {
        $table->dropColumn('group_id');
    });
}
};
