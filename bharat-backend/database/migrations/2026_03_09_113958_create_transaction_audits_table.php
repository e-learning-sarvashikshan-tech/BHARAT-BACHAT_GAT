<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('transaction_audits', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('transaction_id'); // Links to the original transaction
            $table->unsignedBigInteger('admin_id'); // Who made the edit/delete
            $table->string('action'); // 'edited' or 'deleted'
            $table->decimal('old_amount', 10, 2)->nullable();
            $table->decimal('new_amount', 10, 2)->nullable();
            $table->text('reason'); // Why they changed or deleted it
            $table->timestamps();

            // Foreign keys
            $table->foreign('transaction_id')->references('id')->on('transactions')->onDelete('cascade');
            $table->foreign('admin_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down()
    {
        Schema::dropIfExists('transaction_audits');
    }
};