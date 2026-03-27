<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
{
    Schema::table('users', function (Blueprint $table) {
        // 'admin' or 'member'
        $table->string('group_role')->default('member')->after('group_id');
        // 'pending', 'approved', or 'rejected'
        $table->string('group_status')->default('pending')->after('group_role');
    });
}

public function down()
{
    Schema::table('users', function (Blueprint $table) {
        $table->dropColumn(['group_role', 'group_status']);
    });
}
};
