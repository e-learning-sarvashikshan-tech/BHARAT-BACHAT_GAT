<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::table('groups', function (Blueprint $table) {
            // Default max loan of ₹50,000 and 2% monthly interest
            $table->decimal('max_loan_amount', 10, 2)->default(50000.00)->after('monthly_contribution');
            $table->decimal('interest_rate', 5, 2)->default(2.00)->after('max_loan_amount'); 
        });
    }

    public function down()
    {
        Schema::table('groups', function (Blueprint $table) {
            $table->dropColumn(['max_loan_amount', 'interest_rate']);
        });
    }
};