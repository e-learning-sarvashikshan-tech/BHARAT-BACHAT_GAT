<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
 {
     Schema::table('loans', function (Blueprint $table) {
         // Adds the missing column safely!
         if (!Schema::hasColumn('loans', 'amount_paid')) {
             $table->decimal('amount_paid', 10, 2)->default(0.00)->after('duration_months');
         }
     });
 }

 public function down(): void
 {
     Schema::table('loans', function (Blueprint $table) {
         $table->dropColumn('amount_paid');
     });
 }
};
