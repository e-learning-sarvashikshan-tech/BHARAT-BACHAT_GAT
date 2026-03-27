<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('meeting_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('group_id')->constrained()->onDelete('cascade'); 
            $table->date('meeting_date');
            $table->text('minutes_text'); 
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('meeting_records');
    }
};