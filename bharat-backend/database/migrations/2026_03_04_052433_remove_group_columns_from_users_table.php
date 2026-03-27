<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            // We drop the foreign key first, then the columns
            $table->dropForeign(['group_id']);
            $table->dropColumn(['group_id', 'group_role', 'group_status']);
        });
    }

    public function down()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('group_id')->nullable();
            $table->string('group_role')->default('member');
            $table->string('group_status')->default('pending');
        });
    }
};